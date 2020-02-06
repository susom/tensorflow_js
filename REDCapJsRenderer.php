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
     * @return
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
            "event_id"  => $event_id,
            "form_name" => $form_name,
            "record" => $record,
            "instance" => $instance
        ];

        // Log it
        $log_id = $module->log($hash, $value);
        $module->emDebug(__METHOD__, $log_id);
        return $log_id;
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