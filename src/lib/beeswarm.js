import _ from "lodash"
import $ from "jquery"
import * as d3 from "d3"
import * as d3jetpack from "d3-jetpack"

import "./beeswarm.less"


class Beeswarm {
    constructor (opt, b) {
        console.log("Starting Beeswarm:", this)
        this.$  = $(opt.container)
        this.d3 = d3.select(opt.container)
        this.svg = {
            d3: this.d3.selectAppend("svg"),
            $: this.$.find("svg")
        }
        this.makeAxes(opt.axes)
        this.makeForce(_.extend({
            chargeStr: -0.2,
            collideStr: 0.6,
            clusterStr: 0.07
        }, opt))
        $(window).on("resize", () => this.redraw())
    }

    setData (data) {
        this.data = data
        this.setVals()
        this.setDomains(data)
        this.makeNodes(data)
        this.redraw()
    }

    redraw () {
        this.onRedraw()
        this.setRanges()
        this.setAxes()
        this.setNodes()
        this.sim.alpha(1)
        this.sim.restart()
    }

    onRedraw () {} // Placeholder for custom pre-redraw event


    //============//
    //   Values   //
    //============//
    // IMPORTANT: Set x/y/y/cVals here
    setVals () {
        console.error("The placeholder .setVal() function doesn't do anything!")
        // // Example
        // _.each(this.data, d => {
        //     const data = d.data[this.year] || {}
        //     d.xVal = (_.find(data.rows, this.filter) || {})[this.measure]
        //     d.yVal = data[this.yKey]
        //     d.cVal = data[this.cKey]
        //     d.rVal = data[this.rKey]
        // })
    }

    get (d, k) {
        return (k === "x") ? this.getXVal(d) :
               (k === "y") ? this.getYVal(d) :
               (k === "r") ? this.getRVal(d) :
               (k === "c") ? this.getCVal(d) :
                             null
    }

    getXVal (d) { return d.xVal }
    getYVal (d) { return d.yVal }
    getRVal (d) { return d.rVal }
    getCVal (d) { return d.cVal }
    getX (d) { return this.scale.x(this.getXVal(d)) || 0 }
    getY (d) { return this.scale.y(this.getYVal(d)) || 0 }
    getR (d) { return this.scale.r(this.getRVal(d)) || 0 }
    getC (d) { return this.scale.c(this.getCVal(d)) }


    //===========//
    //   Force   //
    //===========//
    onTick () {
        this.nodes.at("cx", d => d.x)
                  .at("cy", d => d.y)
    }

    toAnchor (alpha, clusterStr) {
        const delta = alpha * clusterStr
        _.each(this.data, d => {
            d.vx += (d.tx - d.x) * delta
            d.vy += (d.ty - d.y) * delta
        })
    }

    makeForce (opt) {
        this.sim = d3.forceSimulation().stop()
        this.sim.force("charge",  d3.forceManyBody().strength(opt.chargeStr))
                .force("collide", d3.forceCollide().strength(opt.collideStr))
                .force("anchor",  alpha => this.toAnchor(alpha, opt.clusterStr))
                .on("tick", () => this.onTick())
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
        this.nodes = this.d3.select(".nodes")
                            .appendMany("g", data)
                            .append("circle")
    }

    setNodes () {
        _.each(this.data, d => {
            d.r  = this.getR(d)
            d.tx = this.getX(d)
            d.ty = this.getY(d)
        })
        this.nodes.at("r", d => (!d.tx || !d.ty) ? 0 : d.r) // Hide invalid nodes
        this.nodes.st("fill", d => this.getC(d))
        this.sim.force("collide").radius(d => d.r + 0.5)
    }


    //==========//
    //   Axes   //
    //==========//
    makeAxes (opt) {
        this.scale  = opt.scale
        this.domain = opt.domain
        this.axis   = opt.axis
        _.each(this.axis, (axis, k) => {
            axis.scale(this.scale[k])
        })
    }

    setDomains () {
        _.each(this.domain, (domain, k) => {
            let scale = this.scale[k],
                vals = _.map(this.data, d => this.get(d, k))
            if (domain === "max") {
                domain = [0, _.max(vals)]
            }
            else if (domain === "extent") {
                domain = d3.extent(vals)
            }
            else if (domain === "vals") {
                domain = _(vals).uniq().filter().sort().value()
            }
            else if (domain instanceof Function) {
                domain = domain(this.data)
            }
            // An array must be provided or produced
            if (domain instanceof Array) {
                scale.domain(domain)
                if (scale.nice) scale.nice()
            }
        })
    }

    setRanges () {
        const width  = this.svg.$.width(),
              height = this.svg.$.height()
        this.scale.x.range([0, width])
        this.scale.y.range([height, 0])
    }

    setAxes () {
        if (this.axis.x) this.svg.d3.selectAppend("g.xAxis.axis")
                                    .call(this.axis.x)
        if (this.axis.y) this.svg.d3.selectAppend("g.yAxis.axis")
                                    .call(this.axis.y)
        this.d3.selectAll(".yAxis .tick text").at("x", "0")
        this.d3.selectAll(".yAxis .tick line").at("x1", "0")
                                              .at("x2", "100%")
    }
}

export default Beeswarm
