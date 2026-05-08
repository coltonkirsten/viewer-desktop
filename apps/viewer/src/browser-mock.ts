// Browser mock for Electron APIs - allows the app to run in browser mode for testing/exploration
// This provides stub implementations that allow the UI to render without crashing

const noop = () => {};
const noopPromise = () => Promise.resolve();
const noopUnsubscribe = () => () => {};

// Check if we're in a browser (not Electron)
const isBrowser = typeof window !== 'undefined' && !window.electron;

if (isBrowser) {
  console.log('[Browser Mock] Initializing browser mock for Electron APIs');

  const mockElectron = {
    fs: {
      getTree: () => Promise.resolve({ tree: { name: 'root', path: '/', type: 'directory' as const, modified: new Date().toISOString(), size: 0, children: [] } }),
      getChildren: () => Promise.resolve({ children: [] }),
      watchDir: () => Promise.resolve({ success: true }),
      unwatchDir: () => Promise.resolve({ success: true }),
      readFile: (path: string) => Promise.resolve({ path, content: '// Browser mode - file reading disabled', modified: new Date().toISOString() }),
      writeFile: noopPromise,
      createFile: noopPromise,
      deleteFile: noopPromise,
      rename: noopPromise,
      onChange: noopUnsubscribe,
    },
    app: {
      getRootDir: () => Promise.resolve('/mock/workspace'),
      hasWorkspace: () => Promise.resolve(true),
      setRootDir: (path: string) => Promise.resolve(path),
      openFolderDialog: () => Promise.resolve(null),
      onRootDirChanged: noopUnsubscribe,
      onInitialFolder: noopUnsubscribe,
      onMenuNewTerminal: noopUnsubscribe,
      onMenuCloseWorkspace: noopUnsubscribe,
      onMenuCloseTab: noopUnsubscribe,
      onMenuOpenSearch: noopUnsubscribe,
      onMenuToggleExplorer: noopUnsubscribe,
      onMenuTileWindows: noopUnsubscribe,
      onMenuMaximizeWindow: noopUnsubscribe,
      onMenuPrevTab: noopUnsubscribe,
      onMenuNextTab: noopUnsubscribe,
      onMenuFocusUp: noopUnsubscribe,
      onMenuFocusDown: noopUnsubscribe,
      onMenuFocusLeft: noopUnsubscribe,
      onMenuFocusRight: noopUnsubscribe,
      onMenuNewProject: noopUnsubscribe,
      onMenuLayoutPreset: noopUnsubscribe,
      onMenuOpenClaudePalette: noopUnsubscribe,
    },
    config: {
      load: () => Promise.resolve({
        windows: [],
        expandedDirs: [],
        workspaces: [{
          id: 'browser-mock',
          name: 'Browser Mode',
          rootDir: '/mock/workspace',
          windows: [],
          expandedDirs: [],
        }],
        activeWorkspaceId: 'browser-mock',
      }),
      save: noopPromise,
    },
    terminal: {
      create: () => Promise.resolve({ sessionId: 'mock-terminal', shell: '/bin/bash', cwd: '/mock/workspace' }),
      write: () => Promise.resolve({ success: true }),
      resize: () => Promise.resolve({ success: true }),
      kill: () => Promise.resolve({ success: true }),
      getShells: () => Promise.resolve({ shells: ['/bin/bash', '/bin/zsh'], defaultShell: '/bin/bash' }),
      getSession: () => Promise.resolve(null),
      onData: noopUnsubscribe,
      onExit: noopUnsubscribe,
    },
    browser: {
      openExternal: () => Promise.resolve({ success: true }),
    },
    leap: {
      status: () => Promise.resolve({
        running: false,
        managed: false,
        pid: null,
        path: '/mock/Ultraleap-Tracking-WS',
      }),
      ensureService: () => Promise.resolve({
        running: false,
        managed: false,
        pid: null,
        path: '/mock/Ultraleap-Tracking-WS',
      }),
    },
    agentTask: {
      create: () => Promise.resolve({ id: 'mock', config: { command: '', cwd: '' }, status: 'pending' as const, createdAt: new Date().toISOString(), outputFile: '' }),
      start: () => Promise.resolve({ id: 'mock', config: { command: '', cwd: '' }, status: 'running-main' as const, createdAt: new Date().toISOString(), outputFile: '' }),
      cancel: () => Promise.resolve({ id: 'mock', config: { command: '', cwd: '' }, status: 'cancelled' as const, createdAt: new Date().toISOString(), outputFile: '' }),
      get: () => Promise.resolve(null),
      list: () => Promise.resolve([]),
      getOutput: () => Promise.resolve({ output: '', offset: 0, hasMore: false }),
      delete: noopPromise,
      cleanup: () => Promise.resolve({ deleted: [] }),
      subscribe: noopPromise,
      unsubscribe: noopPromise,
      onStatus: noopUnsubscribe,
      onOutput: noopUnsubscribe,
      onCompleted: noopUnsubscribe,
      onError: noopUnsubscribe,
    },
    raven: {
      getStatus: () => Promise.resolve({ status: 'stopped' as const, visualMode: 'none' as const }),
      start: () => Promise.resolve({ status: 'running' as const, visualMode: 'none' as const }),
      stop: () => Promise.resolve({ status: 'stopped' as const, visualMode: 'none' as const }),
      setMode: () => Promise.resolve({ status: 'stopped' as const, visualMode: 'none' as const }),
      getTranscripts: () => Promise.resolve({ transcripts: [] }),
      subscribeTranscripts: noopPromise,
      onTranscript: noopUnsubscribe,
      getFunctionLogs: () => Promise.resolve({ logs: [] }),
      onFunctionLog: noopUnsubscribe,
      onStatusChange: noopUnsubscribe,
      onError: noopUnsubscribe,
      memory: {
        list: () => Promise.resolve({ memories: [] }),
        get: () => Promise.resolve(null),
        create: () => Promise.resolve({ id: 'mock', text: '', tags: [], created_at: new Date().toISOString() }),
        update: () => Promise.resolve({ id: 'mock', text: '', tags: [], created_at: new Date().toISOString() }),
        delete: () => Promise.resolve({ success: true }),
        search: () => Promise.resolve({ memories: [] }),
      },
      tool: {
        list: () => Promise.resolve({ tools: [] }),
        get: () => Promise.resolve(null),
        create: () => Promise.resolve({ name: 'mock', description: '', enabled: false, isBuiltIn: false, parameters: [] }),
        update: () => Promise.resolve({ name: 'mock', description: '', enabled: false, isBuiltIn: false, parameters: [] }),
        delete: () => Promise.resolve({ success: true }),
        setEnabled: noopPromise,
      },
      config: {
        get: () => Promise.resolve({}),
        update: () => Promise.resolve({}),
        getPrompts: () => Promise.resolve({}),
        updatePrompts: () => Promise.resolve({}),
        getAllowedApps: () => Promise.resolve({ apps: [] }),
        setAllowedApps: () => Promise.resolve({ apps: [] }),
        getAudioDevices: () => Promise.resolve({ input: [], output: [] }),
        getAudioDeviceConfig: () => Promise.resolve({ input: null, output: null }),
        setAudioDeviceConfig: () => Promise.resolve({ input: null, output: null }),
      },
    },
    mcp: {
      loadSettings: () => Promise.resolve({}),
      listServers: () => Promise.resolve([]),
      getServerStatus: () => Promise.resolve(null),
      startServer: () => Promise.resolve({ id: 'mock', config: { command: '' }, status: 'stopped' as const }),
      stopServer: noopPromise,
      restartServer: () => Promise.resolve({ id: 'mock', config: { command: '' }, status: 'stopped' as const }),
      listTools: () => Promise.resolve([]),
      callTool: () => Promise.resolve(null),
      listResources: () => Promise.resolve([]),
      readResource: () => Promise.resolve(null),
      listPrompts: () => Promise.resolve([]),
      getPrompt: () => Promise.resolve(null),
      sendRaw: noopPromise,
      onStatusChange: noopUnsubscribe,
      onMessage: noopUnsubscribe,
      onNotification: noopUnsubscribe,
    },
    claude: {
      query: () => Promise.resolve({ success: false }),
      abort: () => Promise.resolve({ success: true }),
      getAuthStatus: () => Promise.resolve({ authenticated: false }),
      onStream: noopUnsubscribe,
    },
    control: {
      bridgeReady: noopPromise,
    },
    whisper: {
      setApiKey: () => Promise.resolve({ success: true }),
      transcribe: () => Promise.resolve({ success: false, error: 'Browser mode' }),
      hasApiKey: () => Promise.resolve({ hasKey: false }),
    },
  };

  (window as any).electron = mockElectron;
  console.log('[Browser Mock] Electron APIs mocked successfully');
}

export {};
