import { create } from 'zustand'
import type { WindowScene, SceneFormData } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getAllRouteNames,
} from '@/services/storage'

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null

  loadAll: () => void
  saveScene: (data: SceneFormData) => void
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
}

const byTimeDesc = (a: WindowScene, b: WindowScene) =>
  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()

// 空线路名表示“全部”，此时展示所有记录（按时间倒序）
function scenesForRoute(routeName: string): WindowScene[] {
  return routeName
    ? getScenesByRoute(routeName)
    : getAllScenes().sort(byTimeDesc)
}

export const useSceneStore = create<SceneState>((set) => ({
  scenes: [],
  routeNames: [],
  currentRouteScenes: [],
  selectedRoute: '',
  randomScene: null,

  loadAll: () => {
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    set((state) => ({
      scenes,
      routeNames,
      currentRouteScenes: scenesForRoute(state.selectedRoute),
    }))
  },

  saveScene: (data: SceneFormData) => {
    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    storageSaveScene(scene)
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    set((state) => ({
      scenes,
      routeNames,
      currentRouteScenes: scenesForRoute(state.selectedRoute),
    }))
  },

  deleteScene: (id: string) => {
    storageDeleteScene(id)
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    set((state) => ({
      scenes,
      routeNames,
      currentRouteScenes: scenesForRoute(state.selectedRoute),
      // 被移除的记录不能继续留在灵感页
      randomScene: state.randomScene?.id === id ? null : state.randomScene,
    }))
  },

  selectRoute: (routeName: string) => {
    set({ selectedRoute: routeName, currentRouteScenes: scenesForRoute(routeName) })
  },

  refreshRandom: () => {
    set((state) => {
      // 多于一条时避免连续抽到同一条
      const pool =
        state.randomScene && state.scenes.length > 1
          ? state.scenes.filter((s) => s.id !== state.randomScene!.id)
          : state.scenes
      if (pool.length === 0) return { randomScene: null }
      return { randomScene: pool[Math.floor(Math.random() * pool.length)] }
    })
  },
}))
