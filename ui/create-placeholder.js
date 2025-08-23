const fs = require('fs');
const Canvas = require('canvas');

const canvas = new Canvas.createCanvas(256, 256);
const ctx = canvas.getContext('2d');

// Create placeholder image
ctx.fillStyle = '#f0f0f0';
ctx.fillRect(0, 0, 256, 256);
ctx.fillStyle = '#cccccc';
ctx.font = '20px Arial';
ctx.fillText('Image', 100, 128);
ctx.strokeStyle = '#999999';
ctx.strokeRect(10, 10, 236, 236);

// Save the image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('../assets/images/fallback/placeholder.png', buffer);
