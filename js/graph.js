// States and transitions from RFC 793
const states = {
  'outer-space': {
    label: 'Internet',
    description: 'Clients that use Sentry SDKs',
    styles: ['comp-outer'],
  },
  'web-worker': {
    label: 'Web worker (uwsgi)',
    description: `
    Processes requests <i>synchronously</i>, i.e. without waiting for background tasks to finish.
    Does some basic event checks, discards garbage data, and performs event normalization.
    Returns the event ID.<br><br>
      Sources:
      <ul>
      <li><a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/web/api.py#L465">StoreView class</a></li>
      <li><a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/web/api.py#L532">Main processing function</a></li>
      <li><a href="https://github.com/getsentry/sentry/blob/master/src/sentry/event_manager.py#L443">Normalization in EventManager</a></li>
      </ul>`,
    styles: ['comp-uwsgi', 'comp-sync'],
  },
  'task-preprocess-event': {
    label: 'Task: preprocess_event',
    description: `
      ??? TODO <br><br>
        Source:
        <a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/tasks/store.py#L97">preprocess_event</a>
    `,
    styles: ['comp-celery-task'],
  },
  'task-process-event': {
    label: 'Task: process_event',
    description: `
      Here's what happens on this stage:
      stacktrace processing, plugin preprocessors (e.g. for
        <a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/lang/javascript/plugin.py#L51">
          javascript
        </a> we try to translate the error message)
      <br><br>
      Source:
      <a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/tasks/store.py#L205">process_event</a>
  `,
    styles: ['comp-celery-task'],
  },
  'service-symbolicator': {label: 'Symbolicator'},
  'task-save-event': {
    label: 'Task: save_event',
    styles: ['comp-celery-task'],
  },
  'storage-nodestore': {
    label: 'Nodestore (Google Bigtable)',
    styles: ['comp-database'],
  },
  'redis-buffers': {
    label: 'Redis Cache',
    description: `
      This cache is used to pass data between event processing stages. <br>
      It is powered by <a href="https://github.com/getsentry/rb">RB</a> (Redis Blaster), and is not HA (Highly Available). <br><br>
      This compenent is also known as <i>buffers</i> (in the infrastructure), and <i>default_cache</i> (in the code).
    `,
    styles: ['comp-redis'],
  },
  'database-postgres': {
    label: 'Database (PostgreSQL)',
    styles: ['comp-database'],
  },
  'kafka-eventstream': {
    label: 'Kafka Event Stream',
    styles: ['comp-kafka'],
  },
  'snuba-consumer': {
    description: `
    <i>snuba-consumer</i> is responsible for consuming from the events topic in Kafka and
    writing those events in batches to ClickHouse, the database powering Snuba.
    `,
  },
  'post-process-forwarder': {
    description: `
    <i>post-process-forwarder</i> is responsible for waiting on snuba-consumer to commit writes to ClickHouse,
    and subsequently fire off the post_process_group job to Celery.
    `,
  },
  'task-post-process-group': {
    label: 'Task: post_process_group',
    styles: ['comp-celery-task'],
  },
  'database-clickhouse': {
    label: 'Database (ClickHouse)',
    styles: ['comp-database'],
  },
};

const edges = [
  {
    from: 'outer-space',
    to: 'web-worker',
    options: {
      label: 'Raw event data',
      description: `
        The data looks like this: <br>
        <pre>{"exception":{"values":[{"stacktrace":{"frames":
[{"colno":"12","filename":"http://test.com/f.js",
"function":"?","in_app":true,"lineno":13}]},"type":
"SyntaxError","value":"Use of const in strict mode." ...</pre>
      `,
      styles: ['main-flow'],
    },
  },
  {
    from: 'web-worker',
    to: 'task-preprocess-event',
    options: {
      label: 'Start task',
      description: `
        Source:
        <a href="https://github.com/getsentry/sentry/blob/824c03089907ad22a9282303a5eaca33989ce481/src/sentry/coreapi.py#L182">Scheduling "preprocess_event"</a>
      `,
      styles: ['main-flow'],
    },
  },
  {
    from: 'task-preprocess-event',
    to: 'task-process-event',
    options: {
      label: ' Start task',
      description: `
        Source:
        <a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/tasks/store.py#L78">Scheduling "process_event"</a>
      `,
      styles: ['main-flow'],
    },
  },
  {
    from: 'task-process-event',
    to: 'service-symbolicator',
    options: {
      label: 'Native symbolication',
      description: `
        Minidumps and native stack traces are sent to the Symbolicator service.
      `,
      labelpos: 'l',
    },
  },
  {
    from: 'task-preprocess-event',
    to: 'task-save-event',
  },
  {
    from: 'task-process-event',
    to: 'task-save-event',
    options: {
      label: '  Start task',
      description: `
        Source:
        <a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/tasks/store.py#L193">Scheduling "save_event"</a>
      `,
      styles: ['main-flow'],
    },
  },
  {
    from: 'web-worker',
    to: 'redis-buffers',
    options: {
      label: 'Caching event data',
      description: `
        Source:
        <a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/coreapi.py#L172">Saving event data</a>
      `,
      styles: ['redis-buffers-flow'],
    },
  },
  {
    from: 'redis-buffers',
    to: 'task-preprocess-event',
    options: {styles: ['redis-buffers-flow']},
  },
  {
    from: 'redis-buffers',
    to: 'task-process-event',
    options: {
      styles: ['redis-buffers-flow'],
    },
  },
  {
    from: 'redis-buffers',
    to: 'task-save-event',
    options: {styles: ['redis-buffers-flow']},
  },
  {
    from: 'task-save-event',
    to: 'kafka-eventstream',
    options: {
      labelpos: 'c',
      label: 'Publish to "events" topic                                    ',
      styles: ['main-flow'],
    },
  },
  {
    from: 'task-save-event',
    to: 'storage-nodestore',
    options: {
      label: 'Save event payload',
    },
  },
  {
    from: 'task-save-event',
    to: 'database-postgres',
    options: {
      labelpos: 'c',
      label: '               Save to DB',
      description: `Source: <a href="https://github.com/getsentry/sentry/blob/37eb11f6b050fd019375002aed4cf1d8dff2b117/src/sentry/event_manager.py#L1112">Saving to database</a>`,
    },
  },

  {
    from: 'kafka-eventstream',
    to: 'snuba-consumer',
    options: {
      label: `Consume from "events" topic`,
      styles: ['main-flow'],
    },
  },
  {
    from: 'snuba-consumer',
    to: 'post-process-forwarder',
    options: {
      styles: ['main-flow'],
    },
  },
  {
    from: 'snuba-consumer',
    to: 'database-clickhouse',
  },
  {
    from: 'post-process-forwarder',
    to: 'task-post-process-group',
    options: {
      styles: ['main-flow'],
    },
  },
];

function addEdge(g, fromNode, toNode, options) {
  const defaultOptions = {curve: d3.curveBasis};
  const finalOptions = {...defaultOptions, ...(options || {})};
  g.setEdge(fromNode, toNode, finalOptions);
}

function prepareElements(g) {
  // Add states to the graph, set labels, and style
  Object.keys(states).forEach(function(state) {
    const value = states[state];
    value.rx = value.ry = 5;
    if (value.styles && value.styles.length > 0) {
      value.class = value.styles.join(' ');
    }
    g.setNode(state, value);
  });

  // Add edges
  edges.forEach(function(edgeParams) {
    const options = {...edgeParams.options};
    if (options.styles && options.styles.length > 0) {
      options.class = options.styles.join(' ');
    }
    addEdge(g, edgeParams.from, edgeParams.to, options);
  });
}

function addTooltips(inner, g) {
  // Simple function to style the tooltip for the given node.
  const styleTooltip = (name, description) => {
    return `
      <div class="name">${name}</div>
      <div class="description">${description}</div>
      `;
  };

  const tooltipOptions = {
    gravity: 'w',
    opacity: 1,
    html: true,
    hoverable: true,
  };

  // Add tooltips for nodes
  inner
    .selectAll('g.node')
    .attr('title', v => {
      const node = g.node(v);
      return styleTooltip(node.label.trim(), node.description || '');
    })
    .each(function(v) {
      $(this).tipsy(tooltipOptions);
    });

  // Add tooltips for edges
  inner
    .selectAll('g.edgeLabel')
    .attr('title', e => {
      const edge = g.edge(e);

      return styleTooltip(edge.label.trim(), edge.description || '');
    })
    .each(function(e) {
      $(this).tipsy(tooltipOptions);
    });
}

function initGraph() {
  // Create a new directed graph
  const g = new dagreD3.graphlib.Graph().setGraph({
    rankdir: 'TB',
    acyclicer: 'tight-tree',
  });
  prepareElements(g);

  // Create the renderer
  const render = new dagreD3.render();

  // Set up an SVG group so that we can translate the final graph.
  const svg = d3.select('svg');
  const inner = svg.append('g');

  // Set up zoom support
  const zoom = d3.zoom().on('zoom', () => {
    inner.attr('transform', d3.event.transform);
  });
  svg.call(zoom);

  // Run the renderer. This is what draws the final graph.
  render(inner, g);

  addTooltips(inner, g);

  // Center the graph
  const initialScale = 0.85;
  svg.call(
    zoom.transform,
    d3.zoomIdentity
      .translate((svg.attr('width') - g.graph().width * initialScale) / 2, 20)
      .scale(initialScale)
  );

  svg.attr('height', g.graph().height * initialScale + 40);
}

$(document).ready(initGraph);
