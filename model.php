<?php
namespace Stanford\TensorFlowJS;
/** @var \Stanford\TensorFlowJS\TensorFlowJS $module */

require_once(__DIR__."/vendor/autoload.php");

$loader = new \Twig_Loader_Filesystem(__DIR__."/templates/");
$twig = new \Twig_Environment($loader);

// Additional javascript sources
$sources = [
    $module->getUrl('js/consolelog.js',true,true),
    $module->getUrl('js/redcapTensorFlowModelHelper.js', true, true),
    $module->getUrl('js/model.js', true, true),
];

echo $twig->render("model.twig", [
        "sources"   => $sources,
        "js_link"   => $module->getUrl('js/functions.js')
    ]
);
