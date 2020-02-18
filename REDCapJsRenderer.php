<?php
namespace Stanford\TensorFlowJS;
use Sabre\DAV\Exception;

/** @var TensorFlowJS $module */


/**
 * The purpose of this class is to assist in the secure rendering of an instrument for javascript usage
 * - New Survey Submission
 * - Edit existing survey / form
 */


class REDCapJsRenderer
{

    /**
     * When a field is modified on the client, an ajax call will post the data here
     * The format of the save should be:
     * [
     *  "hash" => "asdfasdf",
     *  "fields" => [
     *      "field_name" => "value",
     *      "field_name" => "value2",
     *      ...
     *  ]
     * @param $data
     * @return mixed
     * @throws Exception
     */
    static function saveData($data) {
        global $module;

        if (empty($data['hash'])) {
            throw new Exception ('Missing hash');
        }
        $hash = $data['hash'];

        if (empty($data['fields'])) {
            throw new Exception ('Missing fields to save');
        }
        $fields = $data['fields'];

        // If the hash is for a 'new record' then we need to create a record first
        $params = self::lookupHash($hash);
        if (empty($params)) {
            throw new Exception ('Supplied hash $hash is invalid');
        }

        $log_id     = $params['log_id'];
        $project_id = $params['project_id'];
        $event_id   = $params['event_id'];
        $form_name  = $params['form_name'];
        $record     = $params['record'];
        $instance   = $params['instance'];
        $timestamp  = $params['timestamp'];

        //TODO: Add support for instances

        if (empty($record)) {
            // This was a 'public' hash so we have to create a record-specific hash now
            $nextRecord = getautoid($project_id, false);
            $newHash    = self::createHash($project_id, $nextRecord, $event_id, $form_name, $instance);
            $module->emDebug("Creating new record: $nextRecord with new hash $newHash");
        }

        // Do we save all at once or one at a time?  Presumably all at once for speed?
//        $fields         = [];
        $valid_fields   = self::getValidFields($project_id,$event_id,$form_name);
        $saveFields     = [];
        foreach ($fields as $field_name => $field_values) {

            // Make sure the field is valid
            if (!in_array($field_name, $valid_fields)) {
                $module->emError("Attempt to save invalid field $field_name", $field_values, $valid_fields);
                continue;
            }

            // TODO: Discuss how to save checkbox values...  Currently client must post ALL boxes in each change
            $saveFields[$field_name] = $field_values;
        }

        $saveData = array(
            $record => array(
                $event_id => $saveFields
            )
        );

        $result = \REDCap::saveData($project_id,'array', $saveData, 'overwrite');

        $module->emDebug("Save Result", $result, $saveData);

        return $result;
        // $hash = isset($data['hash']@$data['hash'];

    }


    /**
     * Utility to return array of valid metadata as an indexed array
     * [0] => record_id,
     * [1] => field_one, ...
     *
     * @param $project_id
     * @param $event_id
     * @param $form_name
     * @return array
     * @throws \Exception
     */
    private static function getValidFields($project_id, $event_id, $form_name) {
        // Get the project object
        global $Proj, $module;
        $_Proj = $Proj->project_id == $project_id ? $Proj : new \Project($project_id);

        // Let's assemble an array of valid fields for this form, starting with event_id:
        $valid_fields = \REDCap::getValidFieldsByEvents($project_id, $event_id);

        $module->emDebug("hey ladies shut uip",$valid_fields);
        // If we have a form, then let's also filter fields by form
        if (!empty($form_name)) {
            $form_fields = \REDCap::getFieldNames($form_name);
            $valid_fields = array_unique(array_merge($valid_fields, $form_fields));
        }

        return $valid_fields;
    }



    /**
     * Take in the hash and then determine what metadata should be returned
     * If there is an existing record, let's include that data as well
     * @param $hash
     * @return array|mixed
     * @throws Exception
     */
    static function getMetadata($hash) {
        global $module;
        $params = self::lookupHash($hash);

        if (empty($params)) {
            // Hash not found
            $result = array(
                'error' => "Unable to find supplied hash: $hash"
            );
        } else {
            // Lets build the metadata
            $module->emDebug($params);

            $log_id     = $params['log_id'];
            $project_id = $params['project_id'];
            $event_id   = $params['event_id'];
            $form_name  = $params['form_name'];
            $record     = $params['record'];
            $instance   = $params['instance'];
            $timestamp  = $params['timestamp'];

            // [log_id] => 31
            // [message] => createHash
            // [project_id] => 39
            // [event_id] => 90
            // [form_name] => survey
            // [record] =>
            // [instance] =>
            // [timestamp] => 2020-02-06 10:01:45

            // Get the project object
            global $Proj;
            $_Proj = $Proj->project_id == $project_id ? $Proj : new \Project($project_id);

            // Set the event id if null to the first event
            if (empty($event_id)) $event_id = $_Proj->firstEventId;

            // Make sure the event is part of the project
            if (empty($_Proj->eventInfo[$event_id])) {
                throw new Exception("Event $event_id is not part of project $project_id");
            }

            // Verify that form name is valid
            if (!empty($form_name)) {

                if(empty($_Proj->forms[$form_name])) {
                    throw new Exception("$form_name is not valid in project $project_id");
                };

                if (!empty($event_id)) {
                    if( ! in_array($form_name,$_Proj->eventsForms[$event_id] ) ) {
                        throw new Exception("$form_name is not enabled in event $event_id of project $project_id");
                    }
                }
            }

            // Get the valid fields for this event/form combination
            $valid_fields = self::getValidFields($project_id, $event_id, $form_name);

            // Let's filter out only those fields that are in the valid_fields array above from all Metadata
            $valid_metadata = array_intersect_key($_Proj->metadata, array_flip($valid_fields));

            // $module->emDebug(count($metadata_all), count($valid_fields), count($metadata));
            $module->emDebug($valid_fields);

            // If we have a record/instance, we need to include the current record's data with this metadata
            if (!empty($record)) {
                // TODO: Implement ability to handle instance numbers - punting for now!

                // Get Data
                $q = \REDCap::getData($project_id, 'array', $record, $valid_fields, $event_id);

                if (empty($q[$record][$event_id])) {
                    $module->emError("Unable to find record $record, event $event_id in query results", $q);
                } else {

                    // Lets add data to the valid metadata
                    foreach ($q[$record][$event_id] as $field_name => $field_data) {
                        if (isset($valid_metadata[$field_name])) {
                            $valid_metadata[$field_name]['current_value'] = $field_data;
                        } else {
                            $module->emError("Data returned field $field_name which isn't part of the valid_metadata", $valid_metadata);
                        }
                    }
                }
            }

            // $module->emDebug($valid_metadata);
            $result = $valid_metadata;
        }

        return $result;
    }


    /**
     * Create a hash and store in the external module settings table.
     * If the event_id is null, it defaults to the first event
     * If the form_name is null, then there is no safety check that fields are part of that form
     * If the record is null, then this is a 'create new record' hash.
     * If the instance is null and the form is repeating, then it is a 'create a new instance' hash
     *
     * @param $project_id
     * @param $event_id
     * @param null $form_name
     * @param null $record
     * @param null $instance
     * @return string
     * @throws \Exception
     */
    static function createHash($project_id, $record = null, $event_id = null, $form_name = null, $instance = null) {
        global $module;
        $hash = self::getUniqueHash($project_id);

        // Get the project object
        global $Proj;
        $_Proj = $Proj->project_id == $project_id ? $Proj : new \Project($project_id);

        // Set the event id if null to the first event
        if (empty($event_id)) $event_id = $_Proj->firstEventId;

        // Make sure the event is part of the project
        if (empty($_Proj->eventInfo[$event_id])) {
            throw new Exception("Event $event_id is not part of project $project_id");
        }

        // Verify that form name is valid
        if (!empty($form_name)) {

            if(empty($_Proj->forms[$form_name])) {
              throw new Exception("$form_name is not valid in project $project_id");
            };

            if (!empty($event_id)) {
                if( ! in_array($form_name,$_Proj->eventsForms[$event_id] ) ) {
                    throw new Exception("$form_name is not enabled in event $event_id of project $project_id");
                }
            }
        }

        $value = [
            "project_id" => $project_id,
            "event_id"   => $event_id,
            "form_name"  => $form_name,
            "record"     => $record,
            "instance"   => $instance,
            "hash"       => $hash
        ];

        $log_id = $module->log(__FUNCTION__, $value);

        // Log it
        $module->emDebug($hash, $log_id);

        return $hash;
    }


    /**
     * Look up the scope for a given hash
     * @param $hash
     * @return array|null
     */
    static function lookupHash($hash) {
        global $module;
        $sql    = "select log_id, message, project_id, event_id, form_name, record, instance, timestamp where hash = '" . db_real_escape_string($hash) . "'";
        $q      = $module->queryLogs($sql);
        $count  = db_num_rows($q);
        if ($count == 1) {
            $result = db_fetch_assoc($q);
            $module->emDebug("Found result from $hash", $result);
            return $result;
        } else {
            $module->emDebug("Found $count results from $hash", $sql);
            return null;
        }
    }


    /**
     * Generate a unique hash within the given project / external module
     * @param $project_id
     * @return string
     */
    private static function getUniqueHash($project_id) {
        global $module;

        do{
            $hash   = generateRandomHash(21);
            $q      = $module->queryLogs("select log_id where message = '" . mysqli_escape_string($hash) . "' and project_id = $project_id");
            $count  = mysqli_num_rows($q);
            $module->emDebug("Found $count rows with $hash in project $project_id");
        } while ($count > 0);

        return $hash;
    }

    /**
     * Find the next available record_id in the RC project
     * @param $project_id
     * @return int
     */
    static function getNextRecordId($project_id){
        $params = array(
            'fields' => array("participant_id")
        );

        $result = \REDCap::getData($project_id);

        $next_available_id = 1;
        if(!empty($result)){
            $next_available_id = max(array_keys($result)) + 1;
        }

        return $next_available_id;
    }
}