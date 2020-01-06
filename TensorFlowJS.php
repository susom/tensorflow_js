<?php
namespace Stanford\TensorFlowJS;

require_once "emLoggerTrait.php";


class TensorFlowJS extends \ExternalModules\AbstractExternalModule {
    use emLoggerTrait;

	public function __construct() {
		parent::__construct();
		// Other code to run when object is instantiated
	}
	
	public function redcap_data_entry_form_top($project_id, $record = NULL, $instrument, $event_id, $group_id = NULL, $repeat_instance = 1 ) {
		
	}

	
	public function redcap_survey_page_top($project_id, $record = NULL, $instrument, $event_id, $group_id = NULL, $survey_hash, $response_id = NULL, $repeat_instance = 1 ) {
		
	}

}