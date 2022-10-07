/**
 * Standard class URL for boxes
 */
const INPUT_BOXES_URL = new URL("https://ncsucgclass.github.io/prog1/boxes.json");

const INPUT_SPHERES_URL = new URL("https://ncsucgclass.github.io/prog1/spheres.json");

const CANVAS_DEFAULT_SCALE = 6;

/**
 * @typedef {Object} Illuminator
 * @property {[number, number, number]} ambient
 * @property {[number, number, number]} diffuse
 * @property {[number, number, number]} specular
 */

/**
 * @typedef {Object} Surface
 * @property {number} n
 */

/**
 * Object representing a box
 * @typedef {Object} Box
 * @property {number} lx
 * @property {number} rx
 * @property {number} by
 * @property {number} ty
 * @property {number} fz
 * @property {number} rz
 */

/**
 * @typedef {Object} Sphere
 * @property {number} r
 */

/**
 * @typedef {Illuminator & Point & Sphere & Surface} SphereIlluminator
 */

/**
 * @typedef {Box & Illuminator & Surface} BoxIlluminator
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
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Point & Illuminator} Light
 */

/**
 * @typedef {Object} IntersectionResult
 * @property {boolean} isIntersecting
 * @property {Array<number>} tList
 * @property {?Array<number>} txList
 * @property {?Array<number>} tyList
 * @property {?Array<number>} tzList
 * @property {Array<Point>} iList
 */

class Vector {
    /**
     * @type {Array<number>}
     */
    dimensions = [];

    constructor(...dimensions) {
        this.dimensions = dimensions;
    }

    magnitude = () => {
        let result = 0;
        for (const dimension of this.dimensions) {
            result += Math.pow(dimension, 2);
        }
        return Math.sqrt(result);
    };

    /**
     * 
     * @param {Vector} vector 
     * @returns 
     */
    static normalize = (vector) => {
        const magnitude = vector.magnitude();
        const result = new Vector();
        for (const dimension of vector.dimensions) {
            result.dimensions.push(dimension / magnitude);
        }
        return result;
    };

    /**
     * 
     * @param  {...Vector} vectors 
     * @returns {Vector}
     */
    static add = (...vectors) => {
        const result = new Vector();
        for (const vector of vectors) {
            const maxDim = Math.max(result.dimensions.length, vector.dimensions.length);
            while (result.dimensions.length < maxDim) {
                result.dimensions.push(0);
            }
            for (let dimIndex = 0; dimIndex < maxDim; dimIndex++) {
                const vDim = vector.dimensions[dimIndex] ?? 0;
                result.dimensions[dimIndex] += vDim;
            }
        }
        return result;
    };

    /**
     * 
     * @param {Vector} vector1 
     * @param {Vector} vector2 
     * @returns {number}
     */
    static dot = (vector1, vector2) => {
        const maxDim = Math.max(vector1.dimensions.length, vector2.dimensions.length);
        let result = 0;
        for (let dimIndex = 0; dimIndex < maxDim; dimIndex++) {
            const vec1Dim = vector1.dimensions[dimIndex] ?? 0;
            const vec2Dim = vector2.dimensions[dimIndex] ?? 0;
            result += (vec1Dim * vec2Dim);
        }
        return result;
    };

    /**
     * 
     * @param {Vector} vector 
     * @param {number} factor 
     * @returns {Vector}
     */
    static scale = (vector, factor) => {
        const result = new Vector();
        for (const dimension of vector.dimensions) {
            result.dimensions.push(dimension * factor);
        }
        return result;
    };
}

/**
 * @param {?number} windowWidth
 * @param {?number} windowHeight
 * @returns {CanvasRenderingContext2D} The context for the first canvas in the document
 */
const getCanvasContext = (windowWidth, windowHeight) => {
    let canvas = document.getElementsByTagName("canvas").item(0);
    if (canvas === null) {
        canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        const ratio = windowWidth / windowHeight;
        canvas.height *= CANVAS_DEFAULT_SCALE;
        canvas.width = canvas.height * ratio;
    }
    return canvas.getContext("2d");
};

/**
 * get the input boxex from the specified URL
 * @param {URL} url URL to fetch the boxes from
 * @returns {Promise<Array<Illuminator & Surface>>} All box objects specified in the url
 */
const getInputObjects = async (url) => {
    const response = await fetch(url);
    return await response.json();
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
 * @param {BoxIlluminator} box 
 * @param {IntersectionResult} intersectionResult 
 * @returns {Vector}
 */
const getBoxNormal = (intersectionResult) => {
    const [t] = intersectionResult.tList;
    const vectComponent = [0, 0, 0];
    const [tl, txr] = intersectionResult.txList;
    if (t === tl) {
        vectComponent[0] += -1;
    } else if (t === txr) {
        vectComponent[0] += 1;
    }
    const [tb, tt] = intersectionResult.tyList;
    if (t === tb) {
        vectComponent[1] += -1;
    } else if (t === tt) {
        vectComponent[1] += 1;
    }
    const [tf, tzr] = intersectionResult.tzList;
    if (t === tf) {
        vectComponent[2] += -1;
    } else if (t === tzr) {
        vectComponent[2] += 1;
    }
    return new Vector(...vectComponent);
};

/**
 * @param {SphereIlluminator} sphere 
 * @param {IntersectionResult} intersectionResult 
 */
const getSphereNormal = (sphere, intersectionResult) => {
    const [i] = intersectionResult.iList;
    return new Vector(i.x - sphere.x, i.y - sphere.y, i.z - sphere.z);
};

/**
 * @param {Illuminator & Surface} object 
 * @param {IntersectionResult} intersectionResult
 * @param {Point} eye
 * @param {Array<Light>} lights
 * @returns {Color}
 */
const computeColor = (object, intersectionResult, eye, lights) => {
    const rgb = [0, 0, 0];
    const [i] = intersectionResult.iList;
    let nVect;
    if (Object.hasOwn(object, "r")) {
        nVect = Vector.normalize(getSphereNormal(object, intersectionResult));
    } else {
        nVect = Vector.normalize(getBoxNormal(intersectionResult));
    }
    const vVect = Vector.normalize(new Vector(eye.x - i.x, eye.y - i.y, eye.z - i.z));
    for (const light of lights) {
        const lVect = Vector.normalize(new Vector(light.x - i.x, light.y - i.y, light.z - i.z));
        const hVect = Vector.normalize(Vector.add(vVect, lVect));
        const nDotL = Vector.dot(nVect, lVect);
        const nDotH = Vector.dot(nVect, hVect);
        for (let colorIndex = 0; colorIndex < rgb.length; colorIndex++) {
            const colAmb = (object.ambient[colorIndex] * light.ambient[colorIndex]);
            const colDif = (object.diffuse[colorIndex] * light.diffuse[colorIndex] * Math.max(nDotL, 0));
            const colSpec = (object.specular[colorIndex] * light.specular[colorIndex] * Math.pow(Math.max(nDotH, 0), object.n));
            rgb[colorIndex] += colAmb + colDif + colSpec;
        }
    }
    const [fR, fG, fB] = rgb;
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
 * @param {Point} p1 
 * @param {Point} p2 
 * @param {number} t 
 * @returns {Point}
 */
const getParametricPoint = (p1, p2, t) => {
    const result = {
        x: p2.x + ((t - 1) * (p2.x - p1.x)),
        y: p2.y + ((t - 1) * (p2.y - p1.y)),
        z: p2.z + ((t - 1) * (p2.z - p1.z)),
    };
    return result;
};

/**
 * 
 * @param {Point} point1 
 * @param {Point} point2 
 * @param {BoxIlluminator} box 
 * @returns {IntersectionResult}
 */
const computeBoxIntersection = (point1, point2, box) => {
    const iList = [];
    const x1 = point1.x;
    const x2 = point2.x;
    const y1 = point1.y;
    const y2 = point2.y;
    const z1 = point1.z;
    const z2 = point2.z;
    const dx = x2 - x1;
    let tx0 = -Infinity;
    let tx1 = Infinity;
    let tl, txr, tt, tb, tf, tzr;
    if (dx !== 0) {
        tl = (box.lx - x1) / dx;
        txr = (box.rx - x1) / dx;
        tx0 = Math.min(tl, txr);
        tx1 = Math.max(tl, txr);
    }

    const dy = y2 - y1;
    let ty0 = -Infinity;
    let ty1 = Infinity;
    if (dy !== 0) {
        tt = (box.ty - y1) / dy;
        tb = (box.by - y1) / dy;
        ty0 = Math.min(tt, tb);
        ty1 = Math.max(tt, tb);
    }

    const dz = z2 - z1;
    let tz0 = -Infinity;
    let tz1 = Infinity;
    if (dz !== 0) {
        tf = (box.fz - z1) / dz;
        tzr = (box.rz - z1) / dz;
        tz0 = Math.min(tf, tzr);
        tz1 = Math.max(tf, tzr);
    }
    const t0 = Math.max(tx0, ty0, tz0);
    const t1 = Math.min(tx1, ty1, tz1);
    let isIntersecting = false;
    if (t1 >= t0) {
        isIntersecting = true;
    }
    /**
     * @type {IntersectionResult}
     */
    const result = {
        isIntersecting,
        tList: [t0, t1],
        txList: [tl, txr],
        tyList: [tb, tt],
        tzList: [tf, tzr],
        iList,
    };
    result.tList.forEach(t => {
        iList.push(getParametricPoint(point1, point2, t));
    });
    return result;
};

/**
 * 
 * @param {Point} point1 
 * @param {Point} point2 
 * @param {SphereIlluminator} sphere 
 * @returns {IntersectionResult}
 */
const computeSphereIntersection = (point1, point2, sphere) => {
    const dpx = new Vector(point2.x - point1.x, point2.y - point1.y, point2.z - point1.z);
    const uVect = Vector.normalize(dpx);
    const oMinusC = new Vector(point1.x - sphere.x, point1.y - sphere.y, point1.z - sphere.z);
    const delta = Math.pow(Vector.dot(uVect, oMinusC), 2) - Math.pow(oMinusC.magnitude(), 2) + Math.pow(sphere.r, 2);
    let isIntersecting = false;
    const ts0 = -(Vector.dot(uVect, oMinusC)) - Math.sqrt(delta);
    const ts1 = -(Vector.dot(uVect, oMinusC)) + Math.sqrt(delta);
    const scaleFactor = dpx.magnitude();
    const t0 = ts0 / scaleFactor;
    const t1 = ts1 / scaleFactor;
    if (delta >= 0) {
        isIntersecting = true;
    }
    const iList = [];
    const result = {
        isIntersecting,
        tList: [t0, t1],
        iList,
    };
    [ts0, ts1].forEach(ts => {
        const [sx, sy, sz] = Vector.scale(uVect, ts).dimensions;
        iList.push({
            x: point1.x + sx,
            y: point1.y + sy,
            z: point1.z + sz,
        });
    });
    return result;
};

/**
 * 
 * @param {CanvasRenderingContext2D} context 
 * @param {Array<Illuminator & Surface>} objects 
 * @param {Point} eye
 * @param {Array<Light>} lights
 */
const drawObjectsInContext = (context, objects, eye, lights) => {
    const { width, height } = context.canvas;

    /**
     * TODO: Arbitrary window
     */
    const windowWidth = 1;
    const windowHeight = 1;
    const pixelWidth = windowWidth / width;
    const pixelHeight = windowHeight / height;

    const pz = 0;

    const imageData = context.createImageData(width, height);
    for (let pxCol = 0; pxCol < width; pxCol++) {
        const px = (0.5 + pxCol) * pixelWidth;
        for (let pxRow = 0; pxRow < height; pxRow++) {
            const py = windowHeight - (0.5 + pxRow) * pixelHeight;
            let mint0 = Infinity;
            /**
             * @type {Illuminator & Surface}
             */
            let mintObject = null;
            /**
             * @type {IntersectionResult}
             */
            let minIntersectionResult = null;
            /**
             * @type {Point}
             */
            const pixel = {
                x: px,
                y: py,
                z: pz,
            };
            for (const object of objects) {
                let intersectionResult;
                if (Object.hasOwn(object, "r")) {
                    intersectionResult = computeSphereIntersection(eye, pixel, object);
                } else {
                    intersectionResult = computeBoxIntersection(eye, pixel, object);
                }
                const t0 = intersectionResult.tList[0];
                if (intersectionResult.isIntersecting && t0 < mint0) {
                    mint0 = t0;
                    mintObject = object;
                    minIntersectionResult = intersectionResult;
                }
            }
            /**
             * @type {Color}
             */
            let color = {
                r: 0,
                g: 0,
                b: 0,
                a: 255,
            };
            if (mintObject !== null) {
                color = computeColor(mintObject, minIntersectionResult, eye, lights);
            }
            drawPixel(imageData, pxCol, pxRow, color);
        }
    }
    context.putImageData(imageData, 0, 0);
};

const main = async () => {
    const windowWidth = 1;
    const windowHeight = 1;
    const context = getCanvasContext(windowWidth, windowHeight);
    const boxes = await getInputObjects(INPUT_BOXES_URL);
    const spheres = await getInputObjects(INPUT_SPHERES_URL);
    const eye = {
        x: 0.5,
        y: 0.5,
        z: -0.5,
    };
    const lights = [
        {
            x: -0.5,
            y: 1.5,
            z: -0.5,
            ambient: [1, 1, 1],
            diffuse: [1, 1, 1],
            specular: [1, 1, 1]
        }
    ];
    drawObjectsInContext(context, [...boxes, ...spheres], eye, lights);
};

window.onload = main;
