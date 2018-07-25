import _ from "lodash"
import $ from "jquery"
import * as d3 from "d3"
import * as d3jetpack from "d3-jetpack"

import SVGBeeswarm from "./beeswarm.js"
import "./beeswarm.less"


class Beeswarm extends SVGBeeswarm {
    constructor (opt, b) {
        super(opt)
        opt.canvas = true
        this.canvas = {
            d3: this.d3.selectAppend("canvas"),
            $: this.$.find("canvas")
        }
        this.svg = this.canvas
    }


    //===========//
    //   Force   //
    //===========//
    onTick () {
        const width  = this.canvas.$.width(),
              height = this.canvas.$.height(),
              context = this.canvas.d3.node().getContext("2d")
        context.clearRect(0, 0, width, height)
        _.each(this.data, d => {
            if (!d.tx || !d.ty) return // Don't draw invalid nodes
            context.beginPath()
            context.fillStyle = this.getC(d)
            context.moveTo(d.x, d.y)
            context.arc(d.x, d.y, d.r, 0, 2 * Math.PI)
            context.fill()
        })
    }


    //===========//
    //   Nodes   //
    //===========//
    makeNodes (data) {
        this.sim.nodes(data)
        _.each(data, d => {
            d.x = this.$.width() * Math.random()
            d.y = this.$.height() * Math.random()
        })
    }
    setNodes () {
        _.each(this.data, d => {
            d.r  = this.getR(d)
            d.tx = this.getX(d)
            d.ty = this.getY(d)
        })
        this.sim.force("collide").radius(d => d.r + 0.5)
    }


    //==========//
    //   Axes   //
    //==========//
    setAxes () {
        const width  = this.svg.$.width(),
              height = this.svg.$.height()
        // Canvas needs width/height attributes to scale properly
        if (this.canvas) {
            this.canvas.d3.at("width", width)
                          .at("height", height)
        }
        this.scale.x.range([0, width])
        this.scale.y.range([height, 0])
        // this.d3.select(".xAxis").call(this.axis.x)
        // this.d3.select(".yAxis").call(this.axis.y)
        // this.d3.selectAll(".yAxis .tick text").at("x", "0")
        // this.d3.selectAll(".yAxis .tick line").at("x1", "0")
        //                                       .at("x2", "100%")
    }
}

export default Beeswarm
