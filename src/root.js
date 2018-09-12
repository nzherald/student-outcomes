import _ from "lodash"
import $ from "jquery"
import * as d3 from "d3"
import * as d3jetpack from "d3-jetpack"

import HTML from "./root.html"
import "./base.less"
import "./root.less"

import Beeswarm from "./lib/beeswarm-canvas.js"
import Legend from "./lib/legend.js"
import rawData from "./data/parsed.csv"

const MAP = [{
    type: "Total",
    targName: "Total",
    srcNames: ["All Leavers"]
}, {
    type: "Decile",
    targName: "Decile 8-10 (Least deprived)",
    srcNames: ["Decile 8", "Decile 9", "Decile 10"],
    colour: "#29A35A"
}, {
    type: "Decile",
    targName: "Decile 4-7",
    srcNames: ["Decile 4", "Decile 5", "Decile 6", "Decile 7"],
    colour: "#dfc27d"
}, {
    type: "Decile",
    targName: "Decile 1-3 (Most deprived)",
    srcNames: ["Decile 1", "Decile 2", "Decile 3"],
    colour: "#7B3294"
}, {
    type: "Decile",
    targName: "Not Applicable",
    srcNames: ["Not Applicable"],
    colour: "#bfbfbf"
}, {
    type: "Ethnicity",
    targName: "Pākehā",
    srcNames: ["European\\Pākehā"],
    colour: "#82B7D3"
}, {
    type: "Ethnicity",
    targName: "Māori",
    srcNames: ["Māori"],
    colour: "#BE3738"
}, {
    type: "Ethnicity",
    targName: "Pacific",
    srcNames: ["Pacific"],
    colour: "#BEA037"
}, {
    type: "Ethnicity",
    targName: "Asian",
    srcNames: ["Asian"],
    colour: "#3ABB92"
}, {
    type: "Ethnicity",
    targName: "Other",
    srcNames: ["MELAA", "Other"],
    colour: "#bfbfbf"
}]


class Main {
    constructor () {
        // Clean data
        console.log("Raw data:", rawData)
        const data = this.cleanData(rawData)
        console.log("Cleaned data:", data)
        const nodes = this.makeNodes(data)
        console.log("Simulated nodes:", nodes)

        // Set up visualisation
        $("#root").addClass("nzherald").append(HTML)
        const B = new Beeswarm({
            container: ".beeswarm",
            scale: {
                x: d3.scaleLinear(), // Placeholder scale
                y: d3.scaleLinear()  // Placeholder scale
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
            $(".beeswarm .text").html("In 2015, 60,606 students left school. Each dot here represents 50 students.")
            _.each(nodes, d => d.cVal = d3.schemeCategory10[0]) // Base colour
            this.toCentre(nodes)
            this.legend.$.hide()
            $("canvas.labels").hide()
            B.redraw()
        })
        $("#cluster").on("click", () => {
            $(".beeswarm .text").html("more words 1")
            B.clusterBy("outcome")
            $("canvas.labels").show()
        })
        $("#ethnicity").on("click", () => {
            $(".beeswarm .text").html("more words 2")
            this.setColour(data, nodes, "Ethnicity")
            B.onTick()
        })
        $("#deciles").on("click", () => {
            $(".beeswarm .text").html("more words 3")
            this.setColour(data, nodes, "Decile")
            B.onTick()
        })

        // Initialise
        this.legend = new Legend({
            container : "div.legend",
            type      : "colour",
            ticks     : [],
            scale     : d3.scaleOrdinal()
        })
        $("#centre").trigger("click")
        B.setData(nodes)
        $("#loading").fadeTo(600, 0.01, () => $("#loading").remove())
    }

    // Fancy algorithm for setting node colours
    setColour (data, nodes, type) {
        let subgroups = _.filter(MAP, {type})
        _.each(data, (rows, outcome) => {                 // For each outcome
            rows = _.filter(rows, {type})                 // Filter rows first so valSum is correctly calculated
            let pool = _.filter(nodes, {outcome}),        // Filter nodes for for this outcome
                norm = pool.length / _.sumBy(rows, "val") // Sum of vals can be greater than number of nodes, so normalise
            pool = _.sortBy(pool, "y")                    // Sort by vertical position
            _.each(subgroups, v => {                      // For each subgroup
                let subgroup = v.targName,
                    d = _.find(rows, {subgroup}),         // Find data row for subgroup
                    size = _.round(d.val * norm),         // Normalise sample size
                    sample = pool.splice(0, size)         // Grab nodes from the sample based on subgroup size
                _.each(sample, e => e.cVal = v.colour)    // Set colour for the sample based on subgroup
                if (pool.length === 1) {
                    pool[0].cVal = v.colour               // Set colour for straggler
                }
            })
        })
        this.setLegend(subgroups)
    }

    setLegend (subgroups) {
        this.legend.$.show()
        this.legend.scale.range(_.map(subgroups, "colour"))
                         .domain(_.map(subgroups, "targName"))
        this.legend.ticks = this.legend.scale.domain()
        this.legend.update()
    }


    //================//
    //   Clustering   //
    //================//
    // Anchor to centre
    toCentre (nodes) {
        let centre = {
            x: $("canvas.main").width() / 2,
            y: $("canvas.main").height() / 2
        }
        _.each(nodes, d => d.anchor = centre)
    }


    //==========//
    //   Data   //
    //==========//
    cleanData (rawData) {
        _.each(rawData, d => d.val = _.round(d.val / 50))
        return _(rawData).filter({year: "2015"})
                         .groupBy("outcome")
                         .mapValues(group => {
                             return _.map(MAP, o => {
                                 return {
                                     type: o.type,
                                     subgroup: o.targName,
                                     val: _(group).filter(d => o.srcNames.indexOf(d.subgroup) > -1)
                                                  .sumBy("val")
                                 }
                             })
                         }).value()
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
}

new Main()
