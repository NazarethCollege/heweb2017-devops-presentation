import * as React from 'react';
import * as models from './models';
import * as d3 from 'd3';
import * as colortag from './colortag.js';
 
let z = d3.interpolateViridis;
let colorMap = new Map<string, string>();
let genCnt = 0;
let generateColor = (key: string) => {
    if(!colorMap.has(key)) {                    
        colorMap.set(key, z((key.charCodeAt(0)/100+(genCnt+=.065))%1));
    }

    return colorMap.get(key);
}

class TweetHeatAppState {
    fetchState: models.FetchState
    responseVersion: number
    graphVersion: number
    currentTagHistoryResponse?: models.TagHistoryResponse
    selectedTags?: Array<string>
}

export class TweetHeatApp extends React.Component<any, any> {

    constructor(props: TagHistoryGraphProperties) {
        super(props);
        this.state = {
            fetchState: models.FetchState.Idle,
            responseVersion: 0,
            graphVersion: 0,
            currentTagHistoryResponse: null
        }
    }

    componentDidMount() {         
        this.refreshGraphHistory();
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
                    <TagHistoryControls orderedTagUsage={sortedTagUsages} onTagSelected={(t:Array<string>) => this.setState({selectedTags: t})} />
                </div>
                <TagHistoryGraph tagHistory={this.state.currentTagHistoryResponse.Data} selectedTags={this.state.selectedTags} />
            </div>
        }

        let fetching = (state.fetchState == models.FetchState.Idle || state.fetchState == models.FetchState.Fetching);
                        
        return  <div>                    
                    <div ref={(e) => this.graphContainer = e}>
                        <div className={(fetching ? 'fetching' : '') + ' cover'}></div>
                        {state.fetchState == models.FetchState.FetchError &&
                            <div class='error'>fetch error</div>
                        }
                        {fetchSuccess}
                    </div>
                </div>

    }
}

class TagHistoryGraphProperties {
    tagHistory: models.TagHistoryByEpoch
    selectedTags?: Array<string>
}

class TagHistoryGraphState {
    
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
            
        }
    }

    private async renderGraph() {
        window.requestAnimationFrame((function() {
            // This is a check just to make sure the graph isn't rendered over and over in succession.  Only re-render if the
            // data is fresh.
            let tagHistoryByEpoch:models.TagHistoryByEpoch = this.props.tagHistory;
            let selectedTags:Array<string> = this.props.selectedTags || [];

            let allTags = new Array<string>();
            let data = new Array<{[key: string]:Date|number}>();
            let minTime = Infinity;
            let maxTime = 0;
            let maxTags = 0;

            // Format the data so d3.js can read it
            Object.keys(tagHistoryByEpoch).forEach((secondsSinceEpoch: string, index: number) => {                
                minTime = Math.min(minTime, Number(secondsSinceEpoch));
                maxTime = Math.max(maxTime, Number(secondsSinceEpoch));
                let tagHistory: models.TagHistory = tagHistoryByEpoch[secondsSinceEpoch];

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
            
            var area = d3.area().curve(d3.curveBasis)
                .x(function(d, i) { return x(d.data.time.getTime()); })
                .y0(function(d) { return y(d[0]); })
                .y1(function(d) { return y(d[1]); });

            d3SVG          
                .selectAll(".path")                                                  
                .data(tagLayer)
                .enter().append("path")
                .attr("stroke", '#FFF')
                .attr("stroke-width", ".5px")
                .attr("stroke-opacity", ".1")
                .attr("class", "layer")
                .attr("d", area)
                .attr("fill", function(d) { 
                    if(selectedTags.length && selectedTags.indexOf(d.key) == -1) {
                        return '#666';
                    }
                    return generateColor(d.key);
                });

            d3SVG
                .append("g")
                .attr('class', 'legend');

            let legend = d3SVG.selectAll('.legend');
            
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
                            return (date.getUTCMonth()+1) + '/' + date.getUTCDate();
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
        }).bind(this));
    }

    fillGraph() {
        window.requestAnimationFrame(function() {
            let selectedTags:Array<string> = this.props.selectedTags || [];
            let d3SVG = d3.select(this.svgEl);
            d3SVG          
                .selectAll(".layer")                                                  
                .attr("fill", function(d) { 
                    if(selectedTags.length && selectedTags.indexOf(d.key) == -1) {
                        return '#666';
                    }
                    return generateColor(d.key);
                });
        }.bind(this));
    }

    componentDidUpdate() {
        this.fillGraph();
    }

    componentDidMount() {
        this.renderGraph();
    }

    render() {
        // deferred to the next animation frame
        return  <div className='tweetheat--streamgraph'>
                    <svg ref={(e) => this.svgEl = e} />
                </div>
    }
}

class TagHistoryControlsProperties {
    orderedTagUsage: Array<TagUsage>
    onTagSelected: (tags:Array<TagUsage>) => void
}

class TagHistoryControlsState {
    filter: string
    selectedTags: Array<string>
}

export class TagHistoryControls extends React.Component<TagHistoryControlsProperties, TagHistoryControlsState> {
    private filter: HTMLInputElement;

    constructor(props: TagHistoryGraphProperties) {
        super(props);
        this.state = {
            filter: "",
            selectedTags: []
        }
    }

    handleOnInput() {
        this.setState({
            filter: this.filter.value
        });
    }

    toggleSelectedTag(tag: string) {
        let finalTags = this.state.selectedTags;
        if(this.state.selectedTags.indexOf(tag) > -1) {
            finalTags = this.state.selectedTags.filter((t) => t != tag);
        }else{
            finalTags.push(tag);
        }

        this.setState({
            selectedTags: finalTags
        });

        this.props.onTagSelected && this.props.onTagSelected(finalTags);
    }

    render() {
        return <div>
                    <input type='text' value={this.state.filter} ref={(e) => { this.filter = e; }} onInput={this.handleOnInput.bind(this)} />
                    <ul>
                        {this.props.orderedTagUsage.map((tagUsage) => {
                            let filter = this.state.filter.trim();
                            let hidden = filter.length > 0 && tagUsage.Tag.indexOf(filter) == -1;
                            let selected: boolean = this.state.selectedTags.indexOf(tagUsage.Tag) > -1;
                                
                            let style = { };
                            let classes = [];
                            
                            hidden && !selected && classes.push('hidden');
                            selected && classes.push('selected')

                            return  <li style={style} 
                                        className={classes.join(' ')} 
                                        onClick={() => { this.toggleSelectedTag(tagUsage.Tag) }}
                                        key={tagUsage.Tag}>
                                        <i style={{ 'background-color': generateColor(tagUsage.Tag) }}></i><dt>{tagUsage.Tag}</dt><dd>{tagUsage.Usage}</dd>
                                    </li>
                        })}
                    </ul>
                </div>
    }
}