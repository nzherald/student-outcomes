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
        this.makeForce()

        $(window).on("resize", () => this.redraw())
    }
    setData (data) {
        this.data = data
        this.makeNodes(data)
        this.redraw()
    }
    redraw () {
        this.onRedraw()
        this.setDomains()
        this.setAxes()
        this.setNodes()
        this.sim.alpha(1)
        this.sim.restart()
    }
    onRedraw () {} // Placeholder for custom pre-redraw event

    //============//
    //   Values   //
    //============//
    _getX (d) {
        const data = d.data[this.year] || {},
              out  = _.find(data.rows, this.filter) || {},
              val  = out[this.measure]
        return val
    }
    _get (d, k) {
        const data = d.data[this.year] || {}
        return data[k]
    }
    _getY (d) { return this._get(d, this.yKey) }
    _getR (d) { return this._get(d, this.rKey) }
    _getC (d) { return this._get(d, this.cKey) }


    //===========//
    //   Force   //
    //===========//
    _onTick () {
        this.nodes.at("cx", d => d.x)
                  .at("cy", d => d.y)
    }
    _toAnchor (alpha, clusterStr) {
        const delta = alpha * clusterStr
        _.each(this.data, d => {
            d.vx += (d.tx - d.x) * delta
            d.vy += (d.ty - d.y) * delta
        })
    }
    makeForce () {
        const CHARGE_STR  = -0.2,
              COLLIDE_STR = 0.6,
              CLUSTER_STR = 0.07
        this.sim = d3.forceSimulation().stop()
        this.sim.force("charge",  d3.forceManyBody().strength(CHARGE_STR))
                .force("collide", d3.forceCollide().strength(COLLIDE_STR))
                .force("anchor",  alpha => this._toAnchor(alpha, CLUSTER_STR))
                .on("tick", () => this._onTick())
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
            d.r  = this.scale.r(this._getR(d)) || 0
            d.tx = this.scale.x(this._getX(d)) || 0
            d.ty = this.scale.y(this._getY(d)) || 0
        })
        this.nodes.at("r", d => (!d.tx || !d.ty) ? 0 : d.r) // Hide invalid nodes
        this.nodes.st("fill", d => this.scale.c(this._getC(d)))
        this.sim.force("collide").radius(d => d.r + 0.5)
    }


    //==========//
    //   Axes   //
    //==========//
    makeAxes (opt) {
        this.scale = opt.scale
        this.axis  = opt.axis
        _.each(this.axis, (axis, k) => {
            axis.scale(this.scale[k])
        })
    }
    setAxes () {
        const width  = this.svg.$.width(),
              height = this.svg.$.height()
        this.scale.x.range([0, width])
        this.scale.y.range([height, 0])
        this.d3.select(".xAxis").call(this.axis.x)
        this.d3.select(".yAxis").call(this.axis.y)
        this.d3.selectAll(".yAxis .tick text").at("x", "0")
        this.d3.selectAll(".yAxis .tick line").at("x1", "0")
                                              .at("x2", "100%")
    }
    setDomains () {
        const rVals = _.map(this.data, d => this._getR(d))
        this.scale.r.domain([0, _.max(rVals)])

        // Use provided domain or extract unique values from data
        if (this.yDomain) this.scale.y.domain(this.yDomain)
        else {
            const yVals = _.map(this.data, d => this._getY(d)),
                  domain = _(yVals).uniq().filter().sort().value()
            this.scale.y.domain(domain)
        }
    }
}

export default Beeswarm
