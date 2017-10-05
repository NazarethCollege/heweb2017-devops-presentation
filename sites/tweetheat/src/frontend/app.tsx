import './styles.scss';
import * as React from 'react';
import { render } from 'react-dom';
import * as components from './components'; 


class TweetHeat {

    private el: HTMLElement;

    private constructor(el: HTMLElement) { 
        this.el = el;
    }

    public renderRoot() {
        render(<components.TweetHeatApp />, this.el);
    }

    static mount(el: HTMLElement): TweetHeat {
        // create a new container inside the el
        var container = document.createElement('div');
        el.appendChild(container);
        
        let app = new TweetHeat(container);
        app.renderRoot()
        
        return app;
    }

}

document.addEventListener("DOMContentLoaded", () => {
    window['TweetHeat'] = TweetHeat.mount(document.body);
});