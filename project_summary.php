<?php
namespace Stanford\TensorFlowJS;
/** @var TensorFlowJS $module */


require_once(__DIR__."/vendor/autoload.php");

$loader = new \Twig_Loader_Filesystem(__DIR__."/templates/");
$twig = new \Twig_Environment($loader);

echo $twig->render("projectSummary.twig", [
        "modelUrl"  => $module->getUrl('model',true,true)
    ]
);


