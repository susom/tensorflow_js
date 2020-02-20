<?php
namespace Stanford\TensorFlowJS;
/** @var \Stanford\TensorFlowJS\TensorFlowJS $module */

include_once("REDCapJsRenderer.php");

// HANDLE POSTBACKS
if(!empty($_POST['action'])) {
    $action = filter_var($_POST['action'], FILTER_SANITIZE_STRING);
    $hash   = filter_var($_POST['hash'], FILTER_SANITIZE_STRING);

    switch ($action) {
        case "getMetadata":
            $response = REDCapJsRenderer::getMetadata($hash);
            break;

        case "getRecordHash":
            //check if hash is "new record" or "existing record"
            $result     = REDCapJsRenderer::lookupHash($hash);
            $project_id = $result["project_id"];
            $event_id   = $result["event_id"];

            if(!is_null($result["record"])){
                //if existing return existing hash and record_id
                $record_id      = $result["record"];
                $record_hash    = $hash;
            }else{
                //need to create record and get new hash from there
                $record_id      = REDCapJsRenderer::getNextRecordId($project_id);
                $record_hash    = REDCapJsRenderer::createHash($project_id, $record_id, $event_id);
                $result         = REDCapJsRenderer::lookupHash($record_hash);
            }

            $response = array("record_id" => $record_id, "record_hash" => $record_hash, "showme" => $result);
            break;

        case "saveField":
            // IF update_record : use hash supplied by element.
            $input_field = $_POST['input_field'];// filter_var($_POST['input_field'], FILTER_SANITIZE_STRING);
            $input_value = $_POST['input_value'];// filter_var($_POST['input_value'], FILTER_SANITIZE_STRING);
            $field_type  = $_POST['field_type'];

            $fields = array();
            if($field_type == "checkbox"){
                foreach($input_value as $idx => $field_val){
                    $funky_name = $input_field . "___" . $field_val["val"];
                    $fields[$funky_name] = $field_val["checked"];
                }
            }else{
                $fields[$input_field] = $input_value;
            }
            $data = array(
                 "hash" => $hash
                ,"fields" => $fields
            );

            $response = REDCapJsRenderer::saveData($data);
            $response = array("response" => $response, "data" => $data);
            break;

        case "saveAll":

            break;

        default:
            $module->emDebug("$action is not supported");
            http_response_code(400);
            exit();
    }

    header("application/json");
    echo json_encode($response, true);
    exit();
}


// RENDER MAIN PAGE
require_once(__DIR__."/vendor/autoload.php");
$loader = new \Twig_Loader_Filesystem(__DIR__."/templates/");
$twig   = new \Twig_Environment($loader);

// Additional javascript sources
$js_ssources    = [
    $module->getUrl('js/consolelog.js',true,true),
    $module->getUrl('js/redcapTensorFlowModelHelper.js', true, true),
    $module->getUrl('js/redcapForm.js', true, true),
];

//$edit_record_hash   = "8Ru7qRURrcZR6aqMKGSES";
$emSettings         = $module->getProjectSettings();
$project_id         = $module->getProjectId();
$new_record_hash    = REDCapJsRenderer::createHash($project_id);

$rcjs_renderer_config = [
     'new_hash'         => $new_record_hash
    ,'exclude_fields'   => array("survey_complete")
    ,'readonly'         => array("participant_id", "base64_image", "model_results")
    ,'metadata'         => REDCapJsRenderer::getMetadata($new_record_hash)
];

echo $twig->render("model.twig", [
        "sources"           => $js_ssources,
        "emSettings"        => json_encode($emSettings),
        "renderer_config"   => json_encode($rcjs_renderer_config),
    ]
);
