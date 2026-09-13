console.log("MediaMind AI loaded successfully");

document.addEventListener("DOMContentLoaded", function () {

    const links = document.querySelectorAll(".nav-links a");

    links.forEach(function (link) {

        link.addEventListener("click", function () {

            links.forEach(function (item) {
                item.classList.remove("active");
            });

            this.classList.add("active");

        });

    });

});