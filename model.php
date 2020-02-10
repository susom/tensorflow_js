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
            $response = $module->processSave();
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

$emSettings = $module->getProjectSettings();
$project_id = $module->getProjectId();


$context    = [
    'pid'       => $project_id,
    'event'     => $module->getFirstEventId($project_id),
    'instance'  => 1,
//    'hash'      => "8Ru7qRURrcZR6aqMKGSES",
    'hash'      => REDCapJsRenderer::createHash($project_id)

];

echo $twig->render("model.twig", [
        "sources"    => $sources,
        "emSettings" => json_encode($emSettings),
        "context"    => json_encode($context)
    ]
);
