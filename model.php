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

        case "save":
            // IF first_save , need to create new record and return that hash

            // IF update_record : use hash supplied by element.

            $input_value = filter_var($_POST['input_value'], FILTER_SANITIZE_STRING);
            $input_field = filter_var($_POST['input_field'], FILTER_SANITIZE_STRING);

            $data = array(
                 "hash" => $hash
                ,"fields" => array(
                    $input_field => $input_value
                )
            );

            $response = $data;
//            $response = REDCapJsRenderer::saveData($data);
            break;

        case "saveAll":
            $from_form  = $_POST["data"] ?? array();
            $fields     = array();
            foreach($from_form as $field){
                $fields[$field["name"]] = $field["value"];
            }

            $data = array(
                 "hash"     => $hash
                ,"fields"   => $fields
            );

            $response = $data;
//            $response = REDCapJsRenderer::saveData($data);
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
$sources    = [
    $module->getUrl('js/consolelog.js',true,true),
    $module->getUrl('js/redcapTensorFlowModelHelper.js', true, true),
    $module->getUrl('js/model.js', true, true),
    $module->getUrl('js/functions.js', true, true)
];

$edit_record_hash   = "8Ru7qRURrcZR6aqMKGSES";
$emSettings         = $module->getProjectSettings();
$project_id         = $module->getProjectId();
$new_record_hash    = REDCapJsRenderer::createHash($project_id);

$context = [
    'pid'       => $project_id,
    'event'     => $module->getFirstEventId($project_id),
    'instance'  => 1,
    'hash'      => $new_record_hash
];

echo $twig->render("model.twig", [
        "sources"    => $sources,
        "emSettings" => json_encode($emSettings),
        "context"    => json_encode($context),
        "hash"       => $new_record_hash
    ]
);
