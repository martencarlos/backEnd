$("#goto").click(function() {
    $('html, body').animate({
        scrollTop: $("#features").offset().top
    }, 2000);
});