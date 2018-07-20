# tracer

A library and collection of browser extensions for tracing the execution flow
of web pages running in the browser. These traces are stabilized against
non-deterministic behavior and normalized where minor "safe" differences occur.
Resulting traces can be loaded in a "diff" utility to look for differences
between browsers. Ultimately the goal is to simplify discovering the root cause
of site compatibility issues which occur in some, but not all major browsers.

## Getting Started

### Installation
1. Clone this repository locally
2. Run `npm install`
3. Run `npm run build`
4. Add the "dist" directory as a browser extension ([see below](#adding-a-local-browser-extension))

### Adding a Local Browser Extension

#### Chrome

1. Navigate to "[chrome://extensions](chrome://extensions)"
2. Click "Load Unpacked"
3. Choose the "tracer/dist" directory

#### Edge

1. Open the "..." menu
2. Click "Extensions"
3. Scroll down and click "Load extension"
4. Choose the "tracer/dist" directory

#### Firefox

1. Navigate to "[about:debugging#addons](about:debugging#addons)"
2. Click "Load Temporary Add-on..."
3. Choose "tracer/dist/manifest.json"

### Running

1. Navigate to the page you want to trace
2. Click the tracer "T" icon to begin tracing (page will reload)
3. (Optionally) interact with the page
4. Click the tracer "T" icon to end tracing (download prompt will appear)
5. Save the trace to disk
6. Repeat steps 1-5 in each target browser
7. Open the traces in your diff tool ([see below](#diff-in-visual-studio-code))

### Diff in Visual Studio Code

1. Open two trace files from different browsers
2. Select both files in the "Open Editors" panel
3. Right-click on one of the files and choose "Compare Selected"

## Tips

### Ignoring Page Load

You can capture a trace of just a specific interaction (e.g. clicking on a 
button) by stopping tracing after the page reloads, but ignoring the prompt to
download the trace file. Then you can restart tracing by clicking the "T" icon
again, interact with the page, and stop tracing. At this point you'll be
prompted to download a new trace file of just your most recent interaction.
