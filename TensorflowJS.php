<?php
namespace Stanford\TensorflowJS\TensorflowJS;

class TensorflowJS extends \ExternalModules\AbstractExternalModule {
	public function __construct() {
		parent::__construct();
		// Other code to run when object is instantiated
	}
	
	public function redcap_data_entry_form_top( int $project_id, string $record = NULL, string $instrument, int $event_id, int $group_id = NULL, int $repeat_instance = 1 ) {
		
	}

	
	public function redcap_survey_page_top( int $project_id, string $record = NULL, string $instrument, int $event_id, int $group_id = NULL, string $survey_hash, int $response_id = NULL, int $repeat_instance = 1 ) {
		
	}

	
}