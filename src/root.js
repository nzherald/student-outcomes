import _ from "lodash"
import $ from "jquery"
import * as d3 from "d3"
import * as d3jetpack from "d3-jetpack"

import HTML from "./root.html"
import "./base.less"
import "./root.less"

import Beeswarm from "./lib/beeswarm-canvas.js"
import Legend from "./lib/legend.js"
import ScriptBox from "./lib/scriptbox.js"
import rawData from "./data/parsed.csv"


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
        this.swarm = this.makeSwarm()
        this.legend = this.makeLegend()

        // Initialise
        this.toCentre(nodes)
        this.swarm.setData(nodes)
        this.swarm.clusterBy("outcome", {
            edgePadding: 20,
            chargeStr: -10,
            collideRad: 1.2,
            collideStr: 1.2,
            labels: {
                offset: 0.6,
                arcStart: 0.63,
                arcEnd: -0.6
            }

        })
        _.each(nodes, d => d.cVal = d3.schemeCategory10[0]) // Base colour
        this.legend.$.hide()
        this.setButtons(nodes)

        let vals = _(data).map().flatten()
                          .filter(d => {
                              d.val *= 1
                              return ["Asian"].indexOf(d.subgroup) > -1
                          }).value()
        let sum = _(vals).sumBy("val")
        _(vals).groupBy("outcome").each((rows, outcome) => {
            let val = _.sumBy(rows, "val")
            console.log(outcome, _.round(val / sum, 3))
        })

        $("#intro").trigger("click")
        $("#loading").fadeTo(600, 0.01, () => $("#loading").remove())
    }


    setButtons (nodes) {
        let el = d3.selectAll("div.controller").append("div.decile")
        el.append("div").html("Decile 10 (10% Least deprived)")
        .on("click", () => {
            this.setColour(nodes, "Decile", [{
                label: "Decile 10 (Least deprived)",
                vals: ["Decile 10"],
                colour: "#29A35A"
            }])
            d3.select("div.text").html("Of students from the <b>least deprived 10%</b> of schools, 57% entered university, and 29% were not enrolled in a tertiary institution.")
        })
        el.append("div").html("Decile 1 (10% Most deprived)")
          .on("click", () => {
              this.setColour(nodes, "Decile", [{
                  label: "Decile 1 (Most deprived)",
                  vals: ["Decile 1"],
                  colour: "#9970AB"
              }])
              d3.select("div.text").html("Of students from the <b>most deprived 10%</b> of schools, 13% entered university, and 49% were not enrolled in a tertiary institution.")
          })

        el.append("div").html("Decile 8-10 (30% Least deprived)")
          .on("click", () => {
              this.setColour(nodes, "Decile", [{
                  label: "Decile 8-10 (Least deprived)",
                  vals: ["Decile 8", "Decile 9", "Decile 10"],
                  colour: "#29A35A"
              }])
              d3.select("div.text").html("Of students from the <b>least deprived 30%</b> of schools, 49% entered university, and 32% were not enrolled in a tertiary institution.")
          })
        el.append("div").html("Decile 1-3 (30% Most deprived)")
          .on("click", () => {
              this.setColour(nodes, "Decile", [{
                  label: "Decile 1-3 (Most deprived)",
                  vals: ["Decile 1", "Decile 2", "Decile 3"],
                  colour: "#9970AB"
              }])
              d3.select("div.text").html("Of students from the <b>most deprived 30%</b> of schools, 17% entered university, and 46% were not enrolled in a tertiary institution.")
          })

        el = d3.selectAll("div.controller").append("div.ethnicity")
        el.append("div").html("Māori")
          .on("click", () => {
              this.setColour(nodes, "Ethnicity", [{
                  label: "Māori",
                  vals: ["Māori"],
                  colour: "#BE3738"
              }])
              d3.select("div.text").html("For <b>Māori</b> students, 13% entered university, and 50% were not enrolled in a tertiary institution.")
          })
        el.append("div").html("Pākehā")
          .on("click", () => {
              this.setColour(nodes, "Ethnicity", [{
                  label: "Pākehā",
                  vals: ["European\\Pākehā"],
                  colour: "#82B7D3"
              }])
              d3.select("div.text").html("For <b>Pākehā</b> students, 34% entered university, and 39% were not enrolled in a tertiary institution.")
          })
        el.append("div").html("Pacifika")
          .on("click", () => {
              this.setColour(nodes, "Ethnicity", [{
                  label: "Pacifika",
                  vals: ["Pacific"],
                  colour: "#BEA037"
              }])
              d3.select("div.text").html("For <b>Pacifika</b> students, 22% entered university, and 46% were not enrolled in a tertiary institution.")
          })
        el.append("div").html("Asian")
          .on("click", () => {
              this.setColour(nodes, "Ethnicity", [{
                  label: "Asian",
                  vals: ["Asian"],
                  colour: "#3ABB92"
              }])
              d3.select("div.text").html("For <b>Asian</b> students, 61% entered university, and 22% were not enrolled in a tertiary institution.")
          })
    }

    //==========//
    //   Data   //
    //==========//
    cleanData (rawData) {
        return _(rawData).filter({year: "2015"})
                         .reject({type: "Gender"})
                         .groupBy("outcome").value()
    }

    // Generate simulated students
    makeNodes (data) {
        let nodes = []
        _(data).each((d, outcome) => {
            let total = _.find(d, {type: "Total"})           // Each outcome should have one total
            let cohort = Array(_.ceil(total.val / 50))       // Generate empty array for cohort
            cohort = _.map(cohort, () => {return {outcome}}) // Fill with outcome placeholders
            _(d).groupBy("type").each((rows, type) => {      // For each type
                let sample = _.shuffle(cohort)               // Generate a new randomised sample
                let counter = _.map(rows, r => {             // For each subgroup of this type
                    let c = {key: r.subgroup, val: r.val}    // Create counter
                    sample.pop()[type] = c.key               // Add one so there's at least one node
                    c.val -= 50                              // Reduce counter
                    return c
                })
                while (sample.length) {                      // Assign the rest of the cohort
                    let c = _.maxBy(counter, "val")          // Start with the highest counter value
                    sample.pop()[type] = c.key               // Assign and remove from sample
                    c.val -= 50                              // Reduce counter
                }
            })
            nodes = nodes.concat(cohort)                     // Push cohort
        })
        return nodes
    }


    //============//
    //   Common   //
    //============//
    makeSwarm () {
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
        B.getR = function (d) { return 2.5 }
        B.getC = function (d) { return d.cVal }
        return B
    }

    makeLegend () {
        return new Legend({
            container : "div.legend",
            type      : "colour",
            ticks     : [],
            scale     : d3.scaleOrdinal()
        })
    }

    setLegend (subgroups) {
        this.legend.$.show()
        this.legend.scale.range(_.map(subgroups, "colour"))
                         .domain(_.map(subgroups, "label"))
        this.legend.ticks = this.legend.scale.domain()
        this.legend.update()
    }

    setColour (nodes, key, categories) {
        _.each(nodes, d => d.cVal = "#cfcfcf") // Default colour
        _.each(categories, c => {
            _.each(c.vals, v => {
                _(nodes).filter(d => d[key] === v)
                        .each(d => d.cVal = c.colour)
            })
        })
        this.setLegend(categories)
        this.swarm.onTick()
    }

    // Anchor to centre
    toCentre (nodes) {
        let centre = {
            x: $("canvas.main").width() / 2,
            y: $("canvas.main").height() / 2
        }
        _.each(nodes, d => d.anchor = centre)
        this.swarm.redraw()
    }


    //=============//
    //   DEFUNCT   //
    //=============//
    // Old methods for assigning colours dynamically based on positions
    // // Fancy algorithm for setting node colours
    // setColour (data, nodes, type) {
    //     let subgroups = _.filter(MAP, {type})
    //     _.each(data, (rows, outcome) => {                 // For each outcome
    //         rows = _.filter(rows, {type})                 // Filter rows first so valSum is correctly calculated
    //         let pool = _.filter(nodes, {outcome}),        // Filter nodes for for this outcome
    //             norm = pool.length / _.sumBy(rows, "val") // Sum of vals can be greater than number of nodes, so normalise
    //         pool = _.sortBy(pool, "y")                    // Sort by vertical position
    //         _.each(subgroups, v => {                      // For each subgroup
    //             let subgroup = v.targName,
    //                 d = _.find(rows, {subgroup}),         // Find data row for subgroup
    //                 size = _.round(d.val * norm),         // Normalise sample size
    //                 sample = pool.splice(0, size)         // Grab nodes from the sample based on subgroup size
    //             _.each(sample, e => e.cVal = v.colour)    // Set colour for the sample based on subgroup
    //             if (pool.length === 1) {
    //                 pool[0].cVal = v.colour               // Set colour for straggler
    //             }
    //         })
    //     })
    //     this.setLegend(subgroups)
    //     this.swarm.onTick()
    // }
    // cleanData (rawData) {
    //     _.each(rawData, d => d.val = _.round(d.val / 50))
    //     return _(rawData).filter({year: "2015"})
    //                      .groupBy("outcome")
    //                      .mapValues(group => {
    //                          return _.map(MAP, o => {
    //                              return {
    //                                  type: o.type,
    //                                  subgroup: o.targName,
    //                                  val: _(group).filter(d => o.srcNames.indexOf(d.subgroup) > -1)
    //                                               .sumBy("val")
    //                              }
    //                          })
    //                      }).value()
    // }
    // // Generate simulated students
    // makeNodes (data) {
    //     let nodes = []
    //     _(data).each((r, outcome) => {
    //         let total = _.find(r, {type: "Total"})             // Each outcome should have one total
    //         let cohort = Array(total.val)                      // Generate empty array for cohort
    //         cohort = _.map(cohort, d => { return {outcome} })  // Fill with outcome placeholders
    //         nodes = nodes.concat(cohort)                       // Push cohort
    //     })
    //     return nodes
    // }
}

new Main()
