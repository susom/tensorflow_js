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
     * Return the 'metadata' for rendering the requested instrument
     *
     * @param      $project_id
     * @param      $event_id
     * @param      $form_name
     * @param null $record_id
     * @param null $instance_id
     */
    static function getForm($project_id, $event_id, $form_name, $record_id = null, $instance_id = null) {

    }


    static function saveHash($hash, $minutes_to_expire = 60) {

    }

    /**
     * Take in the hash and then determine what metadata should be returned
     * @param $hash
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

            // Let's assemble an array of valid fields for this form, starting with event_id:
            $valid_fields = \REDCap::getValidFieldsByEvents($project_id, $event_id);

            // If we have a form, then let's also filter fields by form
            if (!empty($form_name)) {
                $form_fields = \REDCap::getFieldNames($form_name);
                $valid_fields = array_unique(array_merge($valid_fields, $form_fields));
            }

            // Let's filter out only those fields that are in the valid_fields array above from all Metadata
            $valid_metadata = array_intersect_key($_Proj->metadata, array_flip($valid_fields));

            // $module->emDebug(count($metadata_all), count($valid_fields), count($metadata));
            // $module->emDebug($valid_fields);

            // If we have a record/instance, we need to include the data with this metadata
            if (!empty($record)) {
                // TODO: Implement ability to handle instance numbers - punting for now!

                // Get Data
                $result = \REDCap::getData($project_id, 'array', $record, $valid_fields, $event_id);

                foreach ($result[$record][$event_id] as $field_name => $field_data) {
                    $valid_metadata[$field_name]['current_value'] = $field_data;
                }
            }

            $module->emDebug($valid_metadata);


        }



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
    static function createHash($project_id, $event_id = null, $form_name = null, $record = null, $instance = null) {
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
        $sql = "select log_id, message, project_id, event_id, form_name, record, instance, timestamp where hash = '" . db_real_escape_string($hash) . "'";
        $q = $module->queryLogs($sql);
        $count = db_num_rows($q);
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
    static function getUniqueHash($project_id) {
        global $module;

        do{
            $hash = generateRandomHash(21);
            $q = $module->queryLogs("select log_id where message = '" . mysqli_escape_string($hash) . "' and project_id = $project_id");
            $count = mysqli_num_rows($q);
            $module->emDebug("Found $count rows with $hash in project $project_id");
        } while ($count > 0);

        return $hash;
    }



}