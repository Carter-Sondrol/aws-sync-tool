import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer, webFrame } from 'electron'

const api = {
    environments: {
        list: () => ipcRenderer.invoke('accounts:list'),
        add: (env) => ipcRenderer.invoke('accounts:add', env),
        remove: (id) => ipcRenderer.invoke('accounts:remove', id),
        validate: (id) => ipcRenderer.invoke('accounts:validate', id),
        detectSessions: () => ipcRenderer.invoke('accounts:detect-sessions')
    },
    graphs: {
        getAll: () => ipcRenderer.invoke('graphs:get-all'),
        save: (envId, graph) => ipcRenderer.invoke('graphs:save', envId, graph),
        clear: (envId) => ipcRenderer.invoke('graphs:clear', envId)
    },
    mapping: {
        get: () => ipcRenderer.invoke('mapping:get'),
        save: (mapping) => ipcRenderer.invoke('mapping:save', mapping)
    },
    discovery: {
        start: (envId, seedArns, excludeResourceTypes, maxDepth) =>
            ipcRenderer.invoke('discovery:start', envId, seedArns, excludeResourceTypes, maxDepth),
        startAll: (envIds, seedArns, excludeResourceTypes, maxDepth) =>
            ipcRenderer.invoke(
                'discovery:start-all',
                envIds,
                seedArns,
                excludeResourceTypes,
                maxDepth
            ),
        cancel: (envId) => ipcRenderer.invoke('discovery:cancel', envId),
        getProgress: (envId) => ipcRenderer.invoke('discovery:progress', envId),
        listService: (envId, service, region) =>
            ipcRenderer.invoke('discovery:list-service', envId, service, region),
        onProgress: (callback) => {
            const handler = (_e, progress) => callback(progress)
            ipcRenderer.on('discovery:progress', handler)
            return () => ipcRenderer.removeListener('discovery:progress', handler)
        },
        onGraphUpdated: (callback) => {
            const handler = (_e, payload) => callback(payload?.envId ?? '')
            ipcRenderer.on('graph:updated', handler)
            return () => ipcRenderer.removeListener('graph:updated', handler)
        }
    },
    exports: {
        summary: () => ipcRenderer.invoke('export:summary'),
        cdk: (outputDir, stackName, envId) =>
            ipcRenderer.invoke('export:cdk', outputDir, stackName, envId),
        validate: (outputDir) => ipcRenderer.invoke('export:validate', outputDir),
        graphJson: (outputPath) => ipcRenderer.invoke('export:graph-json', outputPath)
    },
    sync: {
        push: (sourceEnvId, nodeArn, targetEnvId, targetArn) =>
            ipcRenderer.invoke('sync:push', sourceEnvId, nodeArn, targetEnvId, targetArn)
    },
    dialog: {
        openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
        saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options)
    },
    zoom: {
        setFactor: (factor) => webFrame.setZoomFactor(factor)
    }
}
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-expect-error
    window.electron = electronAPI
    // @ts-expect-error
    window.api = api
}
