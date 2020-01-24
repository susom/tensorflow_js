<?php
namespace Stanford\TensorFlowJS;

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

}