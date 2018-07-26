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
        console.log("Cleaned data:", data)

        // Create clusters
        const POS = _(data).groupBy("outcome")
                           .map((rows, outcome) => {
                               return {
                                   outcome,
                                   count: rows.length,
                                   r: rows.length * 0.5
                               }
                           }).value()

        // Set up visualisation
        $("#root").addClass("nzherald").append(HTML)
        const B = new Beeswarm({
            container: ".beeswarm",
            scale: {
                x: d3.scaleLinear(),
                y: d3.scaleLinear(),
                r: d3.scaleOrdinal().range([3]),
                c: d3.scaleOrdinal().range(d3.schemeCategory10)
            }
        })

        B.getX = function (d) {
            let pos = _.find(POS, {outcome: d.outcome})
            return (pos) ? pos.x || 0 : 0
        }
        B.getY = function (d) {
            let pos = _.find(POS, {outcome: d.outcome})
            return (pos) ? pos.y || 0 : 0
        }
        B.getR = function (d) { return 3 }
        B.getC = function (d) { return this.scale.c(d.decile) }

        // Initialise
        B.setData(data)
        this.forceClusters(POS, () => B.setNodes()) // Position clusters
        $("#loading").fadeTo(600, 0.01, () => $("#loading").remove())
    }

    // Generate simulated students
    cleanData (rawData) {
        let out = []
        _.each(rawData, d => d.val = _.round(d.val / 50))
        _(rawData)
            .filter({year: "2015"})
            .groupBy("outcome").each((r, outcome) => {
                // Set up cohort
                let total = _.find(r, {type: "Total"})             // Each outcome should have one total
                let cohort = Array(total.val)                      // Generate empty array for cohort
                cohort = _.map(cohort, d => { return {outcome} })  // Fill with outcome placeholders
                out = out.concat(cohort)                           // Push cohort

                // Set demographics of cohort
                _(r).reject({type: "Total"})
                    .groupBy("type").each((s, type) => {
                        let pool = cohort.slice(),                 // Reset pool
                            k = type.toLowerCase()
                        _.each(s, d => {                           // Iterate through rows
                            let sample = _.sampleSize(pool, d.val) // Grab a random sample
                            _.each(sample, e => e[k] = d.subgroup) // Tag sample with subgroup
                            pool = _.difference(pool, sample)      // Remove sample from pool
                        })
                    })
            })
        return out
    }

    // Place nodes using d3-force
    forceClusters (nodes, onTick) {
        let opt = {
            chargeStr: -10,
            collideStr: 0.6
        }
        var width = $("canvas").width(),
            height = $("canvas").height()
        _.each(nodes, d => {d.x = width / 2, d.y = height / 2})

        d3.forceSimulation()
          .force("charge",  d3.forceManyBody().strength(opt.chargeStr))
          .force("collide", d3.forceCollide().strength(opt.collideStr).radius(d => d.r * 1.2))
          .nodes(nodes)
          .on("tick", () => {
              _.each(nodes, d => {
                  d.x = _.clamp(d.x, d.r, width - d.r)
                  d.y = _.clamp(d.y, d.r, height - d.r)
              })
              onTick()
          })
    }
}

new Main()
