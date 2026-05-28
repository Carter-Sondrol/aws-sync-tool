import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer, webFrame } from 'electron'
import type { DiscoveryProgress, GraphData, MappingTable } from '../main/graph-types'
import type { DetectedSession, EnvironmentConfig } from '../main/index'
import type { SyncPushResult } from '../main/sync/syncer'

const api = {
    environments: {
        list: (): Promise<EnvironmentConfig[]> => ipcRenderer.invoke('accounts:list'),
        add: (env: EnvironmentConfig): Promise<EnvironmentConfig> =>
            ipcRenderer.invoke('accounts:add', env),
        remove: (id: string): Promise<void> => ipcRenderer.invoke('accounts:remove', id),
        validate: (
            id: string
        ): Promise<{
            valid: boolean
            accountId?: string
            arn?: string
            userName?: string
            error?: string
        }> => ipcRenderer.invoke('accounts:validate', id),
        detectSessions: (): Promise<DetectedSession[]> =>
            ipcRenderer.invoke('accounts:detect-sessions')
    },

    graphs: {
        getAll: (): Promise<Record<string, GraphData>> => ipcRenderer.invoke('graphs:get-all'),
        save: (envId: string, graph: GraphData): Promise<void> =>
            ipcRenderer.invoke('graphs:save', envId, graph),
        clear: (envId?: string): Promise<void> => ipcRenderer.invoke('graphs:clear', envId)
    },

    mapping: {
        get: (): Promise<MappingTable> => ipcRenderer.invoke('mapping:get'),
        save: (mapping: MappingTable): Promise<void> => ipcRenderer.invoke('mapping:save', mapping)
    },

    discovery: {
        start: (
            envId: string,
            seedArns: string[],
            excludeResourceTypes?: string[],
            maxDepth?: number
        ): Promise<{ ok: boolean; error?: string }> =>
            ipcRenderer.invoke('discovery:start', envId, seedArns, excludeResourceTypes, maxDepth),
        startAll: (
            envIds: string[],
            seedArns: string[],
            excludeResourceTypes?: string[],
            maxDepth?: number
        ): Promise<{ ok: boolean; error?: string }> =>
            ipcRenderer.invoke(
                'discovery:start-all',
                envIds,
                seedArns,
                excludeResourceTypes,
                maxDepth
            ),
        cancel: (envId?: string): Promise<void> => ipcRenderer.invoke('discovery:cancel', envId),
        getProgress: (
            envId?: string
        ): Promise<DiscoveryProgress | Record<string, DiscoveryProgress>> =>
            ipcRenderer.invoke('discovery:progress', envId),
        listService: (
            envId: string,
            service: string,
            region?: string
        ): Promise<Array<{ arn: string; name: string; type?: string }>> =>
            ipcRenderer.invoke('discovery:list-service', envId, service, region),
        onProgress: (callback: (progress: DiscoveryProgress) => void) => {
            const handler = (_e: Electron.IpcRendererEvent, progress: DiscoveryProgress) =>
                callback(progress)
            ipcRenderer.on('discovery:progress', handler)
            return () => ipcRenderer.removeListener('discovery:progress', handler)
        },
        onGraphUpdated: (callback: (envId: string) => void) => {
            const handler = (_e: Electron.IpcRendererEvent, payload: { envId: string }) =>
                callback(payload?.envId ?? '')
            ipcRenderer.on('graph:updated', handler)
            return () => ipcRenderer.removeListener('graph:updated', handler)
        }
    },

    exports: {
        summary: () => ipcRenderer.invoke('export:summary'),
        cdk: (outputDir: string, stackName: string, envId: string) =>
            ipcRenderer.invoke('export:cdk', outputDir, stackName, envId),
        validate: (outputDir: string) => ipcRenderer.invoke('export:validate', outputDir),
        graphJson: (outputPath: string): Promise<{ ok: boolean; error?: string }> =>
            ipcRenderer.invoke('export:graph-json', outputPath)
    },

    sync: {
        push: (
            sourceEnvId: string,
            nodeArn: string,
            targetEnvId: string,
            targetArn: string
        ): Promise<SyncPushResult> =>
            ipcRenderer.invoke('sync:push', sourceEnvId, nodeArn, targetEnvId, targetArn)
    },

    dialog: {
        openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-folder'),
        saveFile: (options: { defaultPath: string }): Promise<string | null> =>
            ipcRenderer.invoke('dialog:save-file', options)
    },

    zoom: {
        setFactor: (factor: number) => webFrame.setZoomFactor(factor)
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
