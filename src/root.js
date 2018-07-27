import _ from "lodash"
import $ from "jquery"
import * as d3 from "d3"
import * as d3jetpack from "d3-jetpack"

import HTML from "./root.html"
import "./base.less"
import "./root.less"

import Beeswarm from "./lib/beeswarm-canvas.js"
import rawData from "./data/parsed.csv"


class Main {
    constructor () {
        // Clean data
        console.log("Raw data:", rawData)
        const data = this.cleanData(rawData)
        const nodes = this.makeNodes(data)
        console.log("Cleaned data:", data)
        console.log("Simulated nodes:", nodes)

        // Set up visualisation
        $("#root").addClass("nzherald").append(HTML)
        const B = new Beeswarm({
            container: ".beeswarm",
            scale: {
                x: d3.scaleLinear(),
                y: d3.scaleLinear(),
                // r: d3.scaleOrdinal().range([3, 16]),
                c: d3.scaleOrdinal().range(d3.schemeCategory10)
            },
            chargeStr: -0.7,
            collideStr: 0.4,
            clusterStr: 0.08
        })
        B.sim.force("charge").distanceMax(120)
        B.getX = function (d) { return d.anchor.x }
        B.getY = function (d) { return d.anchor.y }
        B.getR = function (d) { return 3 }
        B.getC = function (d) { return d.cVal }

        // Set controllers
        $("#centre").on("click", () => {
            this.toCentre(nodes)
            B.redraw()
        })
        $("#cluster").on("click", () => {
            this.toClusters(nodes, () => B.setNodes())
            B.redraw()
        })
        $("#ethnicity").on("click", () => {
            this.setColour(data, nodes, "Ethnicity", {
                "Māori": "#D62728",
                "Pacific": "#8C564B",
                "European\\Pākehā": "#1F77B4",
                "Asian": "#FF7F0E",
                "MELAA": "#2CA02C",
                "Other": "#7F7F7F"
            })
            B.onTick()
        })
        $("#deciles").on("click", () => {
            this.setColour(data, nodes, "Decile", {
                "Decile 10": "#91bfdb",
                "Decile 9": "#91bfdb",
                "Decile 8": "#91bfdb",
                "Decile 7": "#ffffbf",
                "Decile 6": "#ffffbf",
                "Decile 5": "#ffffbf",
                "Decile 4": "#ffffbf",
                "Decile 3": "#fc8d59",
                "Decile 2": "#fc8d59",
                "Decile 1": "#fc8d59",
                "Not Applicable": "#bfbfbf"
            })
            B.onTick()
        })

        // Initialise
        _.each(nodes, d => d.cVal = d3.schemeCategory10[0]) // Base colour
        this.toCentre(nodes)
        B.setData(nodes)
        $("#loading").fadeTo(600, 0.01, () => $("#loading").remove())
    }

    cleanData (rawData) {
        _.each(rawData, d => d.val = _.round(d.val / 50))
        return _(rawData).filter({year: "2015"})
                         .groupBy("outcome")
                         .value()
    }

    // Generate simulated students
    makeNodes (data) {
        let nodes = []
        _(data).each((r, outcome) => {
            let total = _.find(r, {type: "Total"})             // Each outcome should have one total
            let cohort = Array(total.val)                      // Generate empty array for cohort
            cohort = _.map(cohort, d => { return {outcome} })  // Fill with outcome placeholders
            nodes = nodes.concat(cohort)                       // Push cohort
        })
        return nodes
    }

    // Fancy algorithm for setting node colours
    setColour (data, nodes, type, colours) {
        _.each(data, (rows, outcome) => {                 // For each outcome
            rows = _.filter(rows, {type})                 // Filter rows first so valSum is correctly calculated
            let pool = _.filter(nodes, {outcome}),        // Filter nodes for for this outcome
                norm = pool.length / _.sumBy(rows, "val") // Sum of vals can be greater than number of nodes, so normalise
            pool = _.sortBy(pool, "y")                    // Sort by vertical position
            _.each(colours, (cVal, subgroup) => {         // For each subgroup
                let d = _.find(rows, {subgroup}),         // Find data row for subgroup
                    size = _.round(d.val * norm),         // Normalise sample size
                    sample = pool.splice(0, size)         // Grab nodes from the sample based on subgroup size
                _.each(sample, e => e.cVal = cVal)        // Set colour for the sample based on subgroup
            })
        })
    }

    // Anchor to centre
    toCentre (nodes) {
        let centre = {
            x: $("canvas").width() / 2,
            y: $("canvas").height() / 2
        }
        _.each(nodes, d => d.anchor = centre)
    }

    // Anchor to clusters
    toClusters (nodes, onTick) {
        const clusters = _(nodes).groupBy("outcome").map((rows, outcome) => {
            let count = rows.length,
                r =  Math.sqrt(count * 50 / Math.PI) + 12
            return {outcome, count, r}
        }).value()
        _(nodes).groupBy("outcome").each((rows, outcome) => {
            let anchor = _.find(clusters, {outcome})
            _.each(rows, d => d.anchor = anchor)
        })
        this.forceClusters(clusters, () => {
            onTick()
            this.drawClusterLabels(clusters)
        })
    }

    drawClusterLabels (nodes) {
        const canvas = d3.select("canvas.labels").node(),
              width  = $(canvas).width(),
              height = $(canvas).height(),
              context = canvas.getContext("2d")
        context.clearRect(0, 0, width, height)
        context.font="20px Stag Book" // Text
        context.fillStyle = "#666"    // Text
        context.strokeStyle = "#ccc"  // Line
        _.each(nodes, d => {
            let labelPoint = addVector(d, -0.55 * Math.PI, d.r)
            context.fillText(d.outcome, labelPoint.x, labelPoint.y)
            context.beginPath()
            context.arc(d.x, d.y, d.r, 0.4 * Math.PI, -0.58 * Math.PI)
            context.stroke()
        })
    }

    // Place nodes using d3-force
    forceClusters (nodes, onTick) {
        let opt = {
            chargeStr: -80,
            collideStr: 0.8
        }
        var width = $("canvas").width(),
            height = $("canvas").height()
        d3.forceSimulation()
          .force("center",  d3.forceCenter().x(width / 2).y(height / 2))
          .force("charge",  d3.forceManyBody().strength(opt.chargeStr))
          .force("collide", d3.forceCollide().strength(opt.collideStr).radius(d => d.r * 1.2))
          .nodes(nodes)
          .on("tick", () => {
              _.each(nodes, d => {
                  let padding = d.r + 40
                  d.x = _.clamp(d.x, padding, width - padding)
                  d.y = _.clamp(d.y, padding, height - padding)
              })
              onTick()
          })
    }
}

function addVector (start, offset, dist) {
    return {
        x: start.x + Math.cos(offset) * dist,
        y: start.y + Math.sin(offset) * dist,
    }
}

new Main()
