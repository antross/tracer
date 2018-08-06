
QUnit.test('Integration', function(assert) {
    const done = assert.async();
    const fixture = document.querySelector('#qunit-fixture');

    fetch('integration.trace.js')
        .then(res => res.text())
        .then(text => text.replace(/\r\n/g, '\n'))
        .then(expected => {

            const frame = document.createElement('iframe');
            frame.src = 'integration.html';
            fixture.appendChild(frame);
            frame.onload = function() {

                const win = frame.contentWindow;
                win.callback = function(trace) {

                    assert.equal(trace.join('\n'), expected, 'Trace matches previously saved version.');

                };
            };
        });
});
