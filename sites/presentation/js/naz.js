(function() {

    Reveal.addEventListener( 'fragmentshown', function( event ) {
	    //console.log(event.eventPhase);
    } );

    Reveal.addEventListener( 'fragmenthidden', function( event ) {
	    //console.log(event.eventPhase);
    } );

    Reveal.addEventListener('slidechanged', function(event) {        
        var opacity = (event.indexh+1) / Reveal.getSlides().length;
        opacity = opacity*opacity*opacity; // easing

        //document.querySelector('.backgrounds').style.opacity = 0;//Math.max(0.05, opacity);               
        var $slide = $(event.currentSlide);
        if($slide.data('initialized') == true)
            return;
        
        console.log('initializing');
        $slide.data('initialized', true);

        $slide.find('.codewrap').each(function() {
            var $codeEl = $('.code', this);
            var cnt = 0;
            var scrollDown = function() {
                cnt = (cnt+1) % 10;
                $codeEl.css('top', (cnt*-10) + '%');
            };        
    
            setInterval(scrollDown, 2000);
        });
    
        $slide.find('.network-pulse').addClass('animated');

        $slide.find('.serverwrap').each(function() {
            var $serverWrap = $(this);
            
            var mutateState = function() {            
                var $allState = $('.state', $serverWrap);
                if($allState.length < 4) {
                    $($serverWrap).append("<div class='state'></div>")
                }

                var $randomState = $($allState.get(Math.floor(Math.random() * $allState.length)));
                var effects = [
                    function($el) {
                        $el.animate({'height': 10 + Math.ceil(Math.random() * 15) + '%' })
                    },
                    function($el) {
                        $el.animate({'width': 30 + Math.ceil(Math.random() * 40) + '%' })
                    },
                    function($el) {
                        $el.animate({'border-radius': Math.ceil(Math.random() * 100) + 'px' })
                    }
                ]
                effects[Math.floor(Math.random() * effects.length)]($randomState);            
            }
    
            setTimeout(function() {
                setInterval(mutateState, 2000)
            }, 200);
        });

        $slide.find('.bundlewrap').each(function() {
            var version = 0;
            $bundle = $(this);
            var takeState = function() {
                setTimeout(function() {
                    version++;
                    $bundle.html('<div class="version">v' + version + '</div>');
                    $slide.find('.serverwrap .state').each(function() {                        
                        $bundle.append($(this).clone().hide().fadeIn())
                    });                    
                    $slide.find('.serverwrap').html('');
                }, 100);                
            }
            setTimeout(function() {
                setInterval(takeState, 10000)
            }, 200);
        })
    });    

})();