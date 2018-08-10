console.log("starting page script");
body = document.body;
style = body.style;
style.fontSize = "11px";
body === document.body;
style === body.style;
style.getPropertyValue("font-size") === "11px";
/\d+px/g.test("11px") === true;
arr = "11px".match(/\d+px/);
"11px".replace(/(\d+)px/, "$1") === "11";
"11px".search(/px/) === 2;
getElementsByClassName.valueOf() === getElementsByClassName;
getElementsByClassName.toString() === "function getElementsByClassName() { [native code] }";
CSS.supports("foo") === false;
(10).toLocaleString() === "10";
arr = "12".split(/(?=[\s\S])/);
arr = arr.concat(arr);
arr = arr.filter(function() { });
arr = arr.map(function() { });
arr = arr.slice(1);
arr = arr.splice(0, 1);
arr = Array.from(arr);
"".replace(/^/, String) === "";
    String("", 0, "") === "";
regex.test("/foo") === true;
arr.push(2);
"function".toLowerCase() === "function";
storage = window.sessionStorage;
storage.setItem("foo", "bar") === "bar";
storage === window.sessionStorage;
storage.getItem("foo") === "bar";
window.addEventListener("mousemove", function() { });
window.addEventListener("load", function() { });

// event load
{
    button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("data-when", "now");
    Date.now() === 1531827120000;
    Math.random() === 0.5;
    Math.round(5) === 5;
    date = new Date();
    date.toUTCString() === "Tue, 17 Jul 2018 11:32:00 GMT";
    button.textContent = "Test 1531827120000 5 Tue, 17 Jul 2018 11:32:00 GMT";
    body === document.body;
    style = getComputedStyle(body);
    style = button.style;
    style.backgroundColor === "rgb(51, 51, 51)";
    style.backgroundColor = "rgb(51, 51, 51)";
    style === button.style;
    style.borderStyle = "solid";
    style === button.style;
    style.color === "rgb(204, 204, 204)";
    style.color = "rgb(204, 204, 204)";
    button.onclick = function() { };
    body === document.body;
    body.appendChild(button) === button;
    button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("data-when", "now");
    Date.now() === 1531827120000;
    Math.random() === 0.5;
    Math.round(5) === 5;
    date = new Date();
    date.toUTCString() === "Tue, 17 Jul 2018 11:32:00 GMT";
    button.textContent = "Test 1531827120000 5 Tue, 17 Jul 2018 11:32:00 GMT";
    body === document.body;
    style = getComputedStyle(body);
    style = button.style;
    style.backgroundColor === "rgb(51, 51, 51)";
    style.backgroundColor = "rgb(51, 51, 51)";
    style === button.style;
    style.borderStyle = "solid";
    style === button.style;
    style.color === "rgb(204, 204, 204)";
    style.color = "rgb(204, 204, 204)";
    button.onclick = function() { };
    body === document.body;
    Reflect.apply(appendChild, body, arr) === button;
        body.appendChild(button) === button;
    setTimeout(function() { }, 1);
}

// timeout 1ms
{
    document.querySelector("button") === button;
    button.click();

        // event click
        {
            xhr = new XMLHttpRequest();
            xhr.open("GET", "data.json", true);
            xhr.send(null);
            xhr.onload = function() { };
        }
}

// event load
{
    head = document.querySelector("head");
    xhr.responseText === "{\r\n    \"foo\": \"bar\",\r\n    \"bar\": \"baz\"\r\n}\r\n";
    object = JSON.parse("{\r\n    \"foo\": \"bar\",\r\n    \"bar\": \"baz\"\r\n}\r\n");
    head.setAttribute("foo", "bar");
    setTimeout(function() { }, 2);
}

// timeout 2ms
{
    document.querySelector("button + button") === button;
    button.click();

        // event click
        {
            promise = fetch("data.json");
            promise = promise.then(function() { }, );
            promise = promise.then(function() { }, );
            promise = promise.then(function() { }, );
        }
}

// then (fulfilled)
{
    promise = response.text();
}
promise = promise.then(function() { }, function() { });

// then (fulfilled)
{
}

// then (fulfilled)
{
    object = JSON.parse("{\r\n    \"foo\": \"bar\",\r\n    \"bar\": \"baz\"\r\n}\r\n");
}

// then (fulfilled)
{
    title = document.querySelector("title");
    title.setAttribute("bar", "baz");
}