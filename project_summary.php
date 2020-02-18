<?php
namespace Stanford\TensorFlowJS;
/** @var TensorFlowJS $module */


require_once(__DIR__."/vendor/autoload.php");

$loader = new \Twig_Loader_Filesystem(__DIR__."/templates/");
$twig = new \Twig_Environment($loader);

echo $twig->render("projectSummary.twig", [
        "modelUrl"  => $module->getUrl('model',true,true) . "&pid=" . $module->getProjectId()
    ]
);



include_once("REDCapJsRenderer.php");

$hash = REDCapJsRenderer::createHash($module->getProjectId(), "1", $module->getFirstEventId(), "survey" );

echo "<pre>";
echo "Made $hash \n";

$result2 = REDCapJsRenderer::lookupHash( $hash );
echo print_r($result2,true);

$result3 = REDCapJsRenderer::getMetadata( $hash);
echo print_r($result3,true);
