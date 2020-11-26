const express = require('express');
const router = express.Router();
const cv = require('opencv.js')
const { Canvas, createCanvas, Image, ImageData, getContext } = require('canvas');
const { JSDOM } = require('jsdom');
const tf = require('@tensorflow/tfjs-node');
const jimp = require('jimp')

router.post('/', async (req, res) => {
    if (!req.body) {
        return res.status(400).send({
            message: "No data is passed in!"
        });
    }
    if (!global.model) {
        try{
        global.model = await tf.loadLayersModel('https://raw.githubusercontent.com/Rabona17/tfjs_models/main/model/model.json');
        } catch{}
    }
    console.log("finished loading models");
    console.log(req.body);
    // try {
    const buf = await Buffer.from(req.body.data, 'base64');
    // } catch(err) {
    //     console.log(err);
    // }
    let jimpSrc = await jimp.read(buf);
    jimpSrc.write('currentImage.png');
    jimpSrc.crop(parseInt(req.body.left)+5,parseInt(req.body.top)+5, parseInt(req.body.width)-10, parseInt(req.body.height)-10).write('./a.png');
    console.log(jimpSrc.getWidth());
    //installDOM();
    console.log(req.body);
    // var img = new Image();
    // img.src = req.body.data;
    // const canvas = createCanvas(img.width, img.height);
    // const ctx = canvas.getContext('2d');
    // ctx.drawImage(img, 0, 0);
    // var imageData = ctx.getImageData(req.body.left, req.body.top, req.body.width, req.body.height);
    predict_(jimpSrc.bitmap, res);

    // call recognition function

});


function getSortedBboxes(imageData) {
    let src = cv.matFromImageData(imageData);
    //var cvs = document.getElementById("myCanvas");
    //var src = cv.imread('myCanvas');
    //var src = context.getImageData(bboxes[i].x+x1, bboxes[i].y+y1, bboxes[i].width, bboxes[i].height);
    //console.log(src.rows, src.cols)


    // var rect = new cv.Rect(0,0,1440,480);
    // src = src.roi(rect);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(src, src, 10, 255, cv.THRESH_BINARY);
    var ksize = new cv.Size(3, 3);
    cv.GaussianBlur(src, src, ksize, 0)
    cv.Canny(src, src, 30, 150)
    var contours = new cv.MatVector();
    var hierarchy = new cv.Mat();
    cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    var pred_rois = []
    for (let i = 0; i < contours.size(); ++i) {
        pred_rois.push(cv.boundingRect(contours.get(i)));
    }
    console.log(pred_rois.length)
    pred_rois.sort(sortBboxLeftToRight)
    //psuedo non-max suppression based purely on iou
    var suppressed_rois = []
    suppressed_rois.push(pred_rois[0])
    for (let i = 1; i < pred_rois.length; ++i) {
        var last_roi = suppressed_rois[suppressed_rois.length - 1]
        if (pred_rois[i].x > last_roi.x + last_roi.width) {
            suppressed_rois.push(pred_rois[i])
        }
    }
    return suppressed_rois
}
function sortBboxLeftToRight(a, b){
    if (a['x']<b['x']){
        return -1;
    }
    else{
        return 1;
    }
}
function predict_(imageData, res) {
    if (global.model) {
        let bboxes = getSortedBboxes(imageData);
        // var canvas = document.getElementById(canvas_id);
        // var context = canvas.getContext('2d');
        let input1 = cv.matFromImageData(imageData);
        var model;

        let predPromises = []
        for (let i = 0; i < bboxes.length; ++i) {
            // var input = context.getImageData(bboxes[i].x+x1, bboxes[i].y+y1, bboxes[i].width, bboxes[i].height);
            // input = cv.matFromImageData(input);

            // console.log(bboxes[i].x,bboxes[i].y,bboxes[i].width,bboxes[i].height)
            // console.log(input1.rows, input1.cols)
            var rect = new cv.Rect(bboxes[i].x, bboxes[i].y, bboxes[i].width, bboxes[i].height);
            var input = input1.roi(rect)
            cv.cvtColor(input, input, cv.COLOR_RGBA2GRAY, 0);

            if (bboxes[i].width > bboxes[i].height) {
                var height = Math.floor(20 * bboxes[i].height / bboxes[i].width);
                cv.resize(input, input, new cv.Size(20, height), 0, 0, cv.INTER_CUBIC);
                var pad_top = Math.floor((28 - height) / 2);
                cv.copyMakeBorder(input, input, pad_top, 28 - pad_top - height, 4, 4, cv.BORDER_CONSTANT, new cv.Scalar(0))
            }
            else {
                var width = Math.floor(20 * bboxes[i].width / bboxes[i].height);
                var pad_left = Math.floor((28 - width) / 2);
                cv.resize(input, input, new cv.Size(width, 20), 0, 0, cv.INTER_CUBIC);
                cv.copyMakeBorder(input, input, 4, 4, pad_left, 28 - pad_left - width, cv.BORDER_CONSTANT, new cv.Scalar(0))
            }
            cv.threshold(input, input, 10, 255, cv.THRESH_BINARY);

            //cv.imshow()
            var tensor = []
            for (let i = 0; i < 28; ++i) {
                var tensor_row = []
                for (let j = 0; j < 28; ++j) {
                    tensor_row.push(input.data[i * 28 + j])
                }
                tensor.push(tensor_row)
            }

            tensor = tf.tensor(tensor).div(255)
            // mat = cv.matFromArray(28, 28, cv.CV_8U, tensor.dataSync());
            // cv.imshow('myCanvas', mat);
            // tensor = tensor.div(255)
            predPromises.push(global.model.predict([tensor.reshape([1, 28, 28, 1])]).array());
            console.log("in for loop")
        }
        Promise.all(predPromises).then((results) => {
            var pred_arr = [];
            results.forEach((scores) => {
                scores = scores[0];
                let predicted = scores.indexOf(Math.max(...scores));
                console.log(predicted);
                pred_arr.push(predicted)
                console.log(pred_arr)
            });
            res.send({result:pred_arr});
        })
        .catch((err) => console.log(err));
    }
    //return { array: pred_arr, bboxes: bboxes }
}

module.exports = router;