
/**
 * Object representing a box
 * @typedef {Object} Box
 * @property {number} lx
 * @property {number} rx
 * @property {number} by
 * @property {number} ty
 * @property {number} fz
 * @property {number} rz
 * @property {[number, number, number]} ambient
 * @property {[number, number, number]} diffuse
 * @property {[number, number, number]} specular
 */

/**
 * @typedef {Object} Color
 * @property {number} r
 * @property {number} g
 * @property {number} b
 * @property {number} a
 */

/**
 * @typedef {Object} Window
 */

/**
 * @typedef {Object} Eye
 * @property {number} ex
 * @property {number} ey
 * @property {number} ez
 */


/**
 * Standard class URL for boxes
 */
const INPUT_BOXES_URL = new URL("https://ncsucgclass.github.io/prog1/boxes.json");

/**
 * 
 * @returns {CanvasRenderingContext2D} The context for the first canvas in the document
 */
const getCanvasContext = () => {
    let canvas = document.getElementsByTagName("canvas").item(0);
    if (canvas === null) {
        canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
    }
    return canvas.getContext("2d");
};

/**
 * get the input boxex from the specified URL
 * @param {URL} url URL to fetch the boxes from
 * @returns {Array<Box>} All box objects specified in the url
 */
const getInputBoxes = async (url) => {
    const response = await fetch(url);
    return response.json();
};

/**
 * draw a pixel at x,y using color
 * @param {ImageData} imageData
 * @param {number} abscissa x coordinate
 * @param {number} ordinate y coordinate
 * @param {Color} color 
 */
const drawPixel = (imageData, abscissa, ordinate, color) => {
    const pixelIndex = (ordinate * imageData.width + abscissa) * 4;
    const imageArray = imageData.data;
    const { r, g, b, a } = color;
    imageArray[pixelIndex] = r;
    imageArray[pixelIndex + 1] = g;
    imageArray[pixelIndex + 2] = b;
    imageArray[pixelIndex + 3] = a;
};

/**
 * 
 * @param {Box['diffuse']} diffuse 
 * @returns {Color}
 */
const diffuseToColor = (diffuse) => {
    const [fR, fG, fB] = diffuse;
    const multiplier = 255;
    return {
        r: fR * multiplier,
        g: fG * multiplier,
        b: fB * multiplier,
        a: 255,
    };
};

/**
 * 
 * @param {CanvasRenderingContext2D} context 
 * @param {Array<Box>} boxes 
 * @param {Eye} eye
 */
const drawBoxesInContext = (context, boxes, eye) => {
    const { width, height } = context.canvas;

    /**
     * TODO: Arbitrary window
     */
    const windowWidth = 1;
    const windowHeight = 1;
    const pixelWidth = windowWidth / width;
    const pixelHeight = windowHeight / height;

    const { ex, ey, ez } = eye;

    const pz = 0;

    const imageData = context.createImageData(width, height);
    for (let pxCol = 0; pxCol < width; pxCol++) {
        const px = (0.5 + pxCol) * pixelWidth;
        for (let pxRow = 0; pxRow < height; pxRow++) {
            const py = (0.5 + pxRow) * pixelHeight;
            let mint0 = Infinity;
            /**
             * @type {Box['diffuse']}
             */
            let mintDiffuse = null;
            for (const box of boxes) {
                const dx = px - ex;
                let tx0 = -Infinity;
                let tx1 = Infinity;
                if (dx !== 0) {
                    const tl = (box.lx - ex) / dx;
                    const tr = (box.rx - ex) / dx;
                    tx0 = Math.min(tl, tr);
                    tx1 = Math.max(tl, tr);
                }

                const dy = py - ey;
                let ty0 = -Infinity;
                let ty1 = Infinity;
                if (dy !== 0) {
                    const tt = (box.ty - ey) / dy;
                    const tb = (box.by - ey) / dy;
                    ty0 = Math.min(tt, tb);
                    ty1 = Math.max(tt, tb);
                }

                const dz = pz - ez;
                let tz0 = -Infinity;
                let tz1 = Infinity;
                if (dz !== 0) {
                    const tf = (box.fz - ez) / dz;
                    const tr = (box.rz - ez) / dz;
                    tz0 = Math.min(tf, tr);
                    tz1 = Math.max(tf, tr);
                }

                const t0 = Math.max(tx0, ty0, tz0);
                const t1 = Math.min(tx1, ty1, tz1);
                if (t1 < t0) {
                    continue;
                }
                if (t0 < mint0) {
                    mint0 = t0;
                    mintDiffuse = box.diffuse;
                }
            }
            let color = {
                r: 0,
                g: 0,
                b: 0,
                a: 255,
            };
            if (mintDiffuse !== null) {
                color = diffuseToColor(mintDiffuse);
            }
            drawPixel(imageData, pxCol, pxRow, color);
        }
    }
    context.putImageData(imageData, 0, 0);
};

const main = async () => {
    const context = getCanvasContext();
    const boxes = await getInputBoxes(INPUT_BOXES_URL);
    const eye = {
        ex: 0.5,
        ey: 0.5,
        ez: -0.5,
    };
    drawBoxesInContext(context, boxes, eye);
};

window.onload = main;
