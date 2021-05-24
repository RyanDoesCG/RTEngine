let cos = Math.cos;
let sin = Math.sin

let vec3 = class {
    constructor (x, y, z) { this.x = x; this.y = y; this.z = z; }
    add         (that)    { return new vec3(this.x + that.x, this.y + that.y, this.z + that.z); }
    minus       (that)    { return new vec3(this.x - that.x, this.y - that.y, this.z - that.z); }
    multiply    (that)    { return new vec3(this.x * that.x, this.y * that.y, this.z * that.z); }
    divide      (that)    { return new vec3(this.x / that.x, this.y / that.y, this.z / that.z); }
    dot         (that)    { return this.x * that.x + this.y * that.y + this.z * that.z }
    normalized  ()        { var l = this.length(); return this.divide(new vec3(l, l, l)); }
    length      ()        { return Math.sqrt(this.dot(this)); }
    array       ()        { return [this.x, this.y, this.z]; }

    toString()
    {
        return this.x.toString() + " " + this.y.toString() + " " + this.z.toString();
    }
};

let mat3 = class {
    constructor(
        x1, y1, z1, 
        x2, y2, z2,
        x3, y3, z3)
    {
        this.x1 = x1; this.y1 = y1; this.z1 = z1;
        this.x2 = x2; this.y2 = y2; this.z2 = z2;
        this.x3 = x3; this.y3 = y3; this.z3 = z3;
    }

    pitch (x)
    {
        return new mat3(
            1.0,    0.0,     0.0,
            0.0,    cos(x), -sin(x),
            0.0,    sin(x),  cos(x)
        )
    }

    yaw (y)
    {
        return new mat3(
            cos(y),  0.0,  sin(y),
            0.0,     1.0,  0.0,
           -sin(y),  0.0,  cos(y)
        )
    }

    roll (z)
    {
        return new mat3(
            cos(z),  -sin(z),  0.0,
            sin(z),   cos(z),  0.0,
            0.0,      0.0,     1.0
        )
    }

    rotation (v, x, y, z)
    {
      //  v = this.roll(z).multiplyVector(v);
        v = this.pitch(x).multiplyVector(v);
        v = this.yaw(y).multiplyVector(v);
        v = this.roll(z).multiplyVector(v);
        return v;
    }

    rotationPrint(x, y, z)
    {
        var rot = this.pitch(x).multiplyMatrix(this.yaw(y).multiplyMatrix(this.roll(z).multiplyMatrix(this.identity())))
        console.log(new vec3(x, y, z))
        console.log(rot)
        console.log()
    }

    multiplyVector (v)
    {
        return new vec3(
            v.dot(new vec3(this.x1, this.y1, this.z1)),
            v.dot(new vec3(this.x2, this.y2, this.z2)),
            v.dot(new vec3(this.x3, this.y3, this.z3))
        );
    }

    multiplyMatrix (that)
    {
        var thisRow1 = new vec3(this.x1, this.y1, this.z1)
        var thisRow2 = new vec3(this.x2, this.y2, this.z2)
        var thisRow3 = new vec3(this.x3, this.y3, this.z3)

        var thatCol1 = new vec3(that.x1, that.x2, that.x3)
        var thatCol2 = new vec3(that.y1, that.y2, that.y3)
        var thatCol3 = new vec3(that.z1, that.z2, that.z3)

        return new mat3(
            thisRow1.dot(thatCol1), thisRow1.dot(thatCol2), thisRow1.dot(thatCol3),
            thisRow2.dot(thatCol1), thisRow2.dot(thatCol2), thisRow2.dot(thatCol3),
            thisRow3.dot(thatCol1), thisRow3.dot(thatCol2), thisRow3.dot(thatCol3),
        )
    }

    array()
    {
        return [ 
            this.x1, this.y1, this.z1,
            this.x2, this.y2, this.z2,
            this.x3, this.y3, this.z3
         ];
    }

    identity()
    {
        return new mat3(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        );
    }

    toString()
    {
    return 
        x1.toString() + " " + y1.toString() + " " + z1.toString() + "\n" + 
        x2.toString() + " " + y2.toString() + " " + z2.toString() + "\n" + 
        x3.toString() + " " + y3.toString() + " " + z3.toString() + "\n";
    }
}