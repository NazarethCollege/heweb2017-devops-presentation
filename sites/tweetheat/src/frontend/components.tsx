import * as React from 'react';
import * as models from './models';
import * as d3 from 'd3';
import * as colortag from './colortag.js';
 

class TweetHeatAppState {

}

export class TweetHeatApp extends React.Component<any, any> {
    render() {
        return <TagHistoryGraph />
    }
}

class TagHistoryGraphProperties {

}

class TagHistoryGraphState {
    fetchState: models.FetchState
    responseVersion: number
    graphVersion: number
    currentTagHistoryResponse?: models.TagHistoryResponse
}

class TagUsage {
    Tag: string
    Usage: number
}

export class TagHistoryGraph extends React.Component<TagHistoryGraphProperties, TagHistoryGraphState> {
    private graphContainer: HTMLElement;
    private svgEl: SVGElement;

    constructor(props: TagHistoryGraphProperties) {
        super(props);
        this.state = {
            fetchState: models.FetchState.Idle,
            responseVersion: 0,
            graphVersion: 0,
            currentTagHistoryResponse: null
        }
    }

    private async refreshGraphHistory() {
        if(this.state.fetchState == models.FetchState.Fetching) return;        
        
        let finalFetchState = models.FetchState.Fetching;
        let tagHistoryResponse: models.TagHistoryResponse;
        this.setState({
            fetchState: finalFetchState
        });

        try {
            let response:Response = await fetch('/api/tag-history');
            if(response.status != 200) {
                throw new Error(`/api/tag-history returned a status of ${response.status}`);
            }
            tagHistoryResponse = await response.json();
            this.setState({
                responseVersion: this.state.responseVersion+1
            })
            finalFetchState = models.FetchState.FetchSuccess;
        }catch(exc) {
            finalFetchState = models.FetchState.FetchError;
        }

        this.setState({
            currentTagHistoryResponse: tagHistoryResponse,
            fetchState: finalFetchState
        });
    }

    private async renderGraph() {
        // This is a check just to make sure the graph isn't rendered over and over in succession.  Only re-render if the
        // data is fresh.
        if(this.state.graphVersion < this.state.responseVersion) {
            let state: TagHistoryGraphState = this.state;

            let allTags = new Array<string>();
            let data = new Array<{[key: string]:Date|number}>();
            let minTime = Infinity;
            let maxTime = 0;
            let maxTags = 0;

            // Format the data so d3.js can read it
            Object.keys(state.currentTagHistoryResponse.Data).forEach((secondsSinceEpoch: string, index: number) => {                
                minTime = Math.min(minTime, Number(secondsSinceEpoch));
                maxTime = Math.max(maxTime, Number(secondsSinceEpoch));
                let tagHistory: models.TagHistory = state.currentTagHistoryResponse.Data[secondsSinceEpoch];

                let thisData: {[key: string]:Date|number} = {};

                thisData.time = new Date(Number(secondsSinceEpoch));
                let theseTags = Object.keys(tagHistory.Tags);
                let tagCnt = 0;
                theseTags.forEach((value: string, index: number) => {
                    tagCnt += tagHistory.Tags[value];
                    thisData[value.toLowerCase()] = tagHistory.Tags[value];
                });
                maxTags = Math.max(maxTags, tagCnt);
                data.push(thisData);

                allTags = theseTags.map((k) => k.toLowerCase()).filter((value, index) => {
                    // filter out duplicates                    
                    return allTags.indexOf(value) == -1;
                }).concat(allTags);            
            });
            console.log(data)
            // Create a stack with the tags as keys 
            let stack = d3.stack()
                .keys(allTags)
                .value((d, key) => {
                    // The tag doesn't always exist at every x value, so rather than
                    // getting NaN, return null
                    return d[key] || null;
                })
                .order(d3.stackOrderNone)
                .offset(d3.stackOffsetSilhouette);
           
            // Create the tag layer data out of its stack definition
            let tagLayer = stack(data),
                d3SVG = d3.select(this.svgEl);
            
            // Get the extents of the SVG
            let width: number = this.svgEl.clientWidth;
            let height: number = this.svgEl.clientHeight;
           
            // X axis goes from the unix epoch time of the first tweet to the unix epoch time
            // of the last tweet
            let x = d3.scaleLinear()
                .domain([minTime, maxTime])
                .range([0, width]);

            // Get the min and max y values from the graph, since creating a stack will position these
            // values for us.
            let minY: number = d3.min(tagLayer, (d) => {
                return d3.min(d, (di) => {
                    return di[1];
                })
            });

            let maxY: number = d3.max(tagLayer, (d) => {
                return d3.max(d, (di) => {
                    return di[1];
                })
            })
            
            let y = d3.scaleLinear()
                .domain([minY, maxY])
                .range([height-60, 0]);
                   
            var z = d3.interpolateViridis;

            var area = d3.area().curve(d3.curveBasis)
                .x(function(d, i) { return x(d.data.time.getTime()); })
                .y0(function(d) { return y(d[0]); })
                .y1(function(d) { return y(d[1]); });

            let colorMap = new Map<string, string>();
            let genCnt = 0;
            let generateColor = (key: string) => {
                if(!colorMap.has(key)) {                    
                    colorMap.set(key, z((key.charCodeAt(0)/35+(genCnt+=.025))%1));
                }

                return colorMap.get(key);
            }

            d3SVG          
                .selectAll(".path")                                                  
                .data(tagLayer)
                .enter().append("path")
                .attr("stroke", '#000000')
                .attr("stroke-width", "1px")
                .attr("stroke-opacity", ".2")
                .attr("class", "layer")
                .attr("d", area)
                .attr("fill", function(d) { 
                    return generateColor(d.key);
                });

            d3SVG
                .append("g")
                .attr('class', 'legend');

            let legend = d3SVG.selectAll('.legend');
            console.log(x.domain())
            let ticks: Array<number> = d3.range(x.domain()[0], x.domain()[1], 1000*60*60);
            
            ticks.forEach((d:number) => {                 
                d3SVG                          
                    .append("text")                          
                    .attr('class', 'legend-date')                           
                    .attr('transform', (() => {                                    
                        return 'translate(' + x(d) + ',' + (height - 25) + ')';
                    }))
                    .text((_x, _y, el: SVGTextElement) => {                                           
                        let date = new Date(d);                        
                        if(date.getHours() == 0) {
                            el[0].setAttribute('class', 'legend-large');                            
                            el[0].setAttribute('opacity', '.75');
                            el[0].setAttribute('text-anchor', 'middle');                            
                            return date.getUTCMonth() + '/' + date.getUTCDate();
                        }else if(date.getHours() == 12) {                            
                            el[0].setAttribute('opacity', '.5');
                            el[0].setAttribute('class', 'legend-small');                            
                            return "|";
                        }else{
                            el[0].setAttribute('opacity', '.25');
                            el[0].setAttribute('class', 'legend-very-small');                            
                            el[0].setAttribute('y', '-6');
                            return ".";
                        }
                    })     
            })

                /*.on("mouseover", function(d, i) {                    
                    d3SVG.selectAll(".layer")                        
                        .attr("opacity", function(d, j) {
                            return j != i ? 0.6 : 1;
                })});                */
            console.log(d3.cubehelix)
        }
    }

    componentDidMount() {         
        this.refreshGraphHistory();
    }

    componentDidUpdate() {
        if(this.state.fetchState == models.FetchState.FetchSuccess) {
            this.renderGraph();
        }
    }

    render() {
        let state: TagHistoryGraphState = this.state;
        let tagUsages = new Map<string, number>();
        let fetchSuccess = null;

        if(state.fetchState == models.FetchState.FetchSuccess) {
            Object.values(state.currentTagHistoryResponse.Data).forEach((tagHistory: models.TagHistory, index: number) => {  
                Object.keys(tagHistory.Tags).forEach((tagName: string, index: number) => {
                    tagUsages.set(tagName, (tagUsages.get(tagName) || 0) + tagHistory.Tags[tagName]);
                });
            })
            let sortedTagUsages: TagUsage = Array.from(tagUsages.entries()).sort((a, b) => { 
                if(a[1] < b[1]) {
                    return 1;
                }if(a[1] > b[1]) {
                    return -1;
                }

                return 0;
            }).map((t) => { return { Tag: t[0], Usage: t[1] } }) 
            
            fetchSuccess = state.fetchState == models.FetchState.FetchSuccess &&
            <div>
                <div className='tweetheat--graph-controls'>
                    <TagHistoryControls orderedTagUsage={sortedTagUsages} />
                </div>
                <div className='tweetheat--streamgraph'>
                    <svg ref={(e) => this.svgEl = e} />
                </div>
            </div>
        }
                        
        return  <div>                    
                    <div ref={(e) => this.graphContainer = e}>
                        {state.fetchState == models.FetchState.Idle &&
                            <div>about to fetch</div>
                        }
                        {state.fetchState == models.FetchState.Fetching &&
                            <div>fetching results</div>
                        }                    
                        {state.fetchState == models.FetchState.FetchError &&
                            <div>fetch error</div>
                        }
                        {fetchSuccess}
                    </div>
                </div>
    }
}

class TagHistoryControlsProperties {
    orderedTagUsage: Array<TagUsage>
}

class TagHistoryControlsState {
    filter: string
}

export class TagHistoryControls extends React.Component<TagHistoryControlsProperties, TagHistoryControlsState> {
    private filter: HTMLInputElement;

    constructor(props: TagHistoryGraphProperties) {
        super(props);
        this.state = {
            filter: ""
        }
    }

    handleOnInput() {
        this.setState({
            filter: this.filter.value
        });
    }

    render() {
        return <div>
                    <input type='text' value={this.state.filter} ref={(e) => { this.filter = e; }} onInput={this.handleOnInput.bind(this)} />
                    {this.props.orderedTagUsage.map((tagUsage) => {
                        let filter = this.state.filter.trim();
                        if(filter.length > 0 && tagUsage.Tag.indexOf(filter) == -1) {
                            return null;
                        }
                            
                        return <li>
                                {tagUsage.Tag} - {tagUsage.Usage}
                             </li>
                    })}
                </div>
    }
}