import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSceneStore } from '@/store/useSceneStore'
import type { SceneFormData, WindowScene } from '@/types'

const STORAGE_KEY = 'bus_window_scenes'

function makeForm(overrides: Partial<SceneFormData> = {}): SceneFormData {
  return {
    routeName: '27路',
    segment: '钟楼 → 大差市',
    seatDirection: '左',
    weather: '晴',
    signText: '',
    treeDensity: '适中',
    pedestrianStatus: '稀少',
    note: '一句观察',
    ...overrides,
  }
}

function seedStorage(scenes: WindowScene[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

function readStorage(): WindowScene[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
}

function state() {
  return useSceneStore.getState()
}

beforeEach(() => {
  localStorage.clear()
  useSceneStore.setState({
    scenes: [],
    routeNames: [],
    currentRouteScenes: [],
    selectedRoute: '',
    randomScene: null,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('saveScene 保存与同步', () => {
  it('保存后立即写入 localStorage 并同步到 store', () => {
    state().saveScene(makeForm())
    const stored = readStorage()
    expect(stored).toHaveLength(1)
    expect(stored[0].routeName).toBe('27路')
    expect(state().scenes).toHaveLength(1)
    expect(state().scenes[0].id).toBe(stored[0].id)
    expect(state().routeNames).toEqual(['27路'])
    // 默认“全部”视图下立即可见
    expect(state().currentRouteScenes.map((s) => s.id)).toEqual([stored[0].id])
  })

  it('每条记录分配唯一 id 和有效时间戳', () => {
    state().saveScene(makeForm())
    state().saveScene(makeForm())
    const [a, b] = state().scenes
    expect(a.id).toBeTruthy()
    expect(b.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
    expect(Number.isNaN(new Date(a.timestamp).getTime())).toBe(false)
  })

  it('新线路保存后 routeNames 立即更新', () => {
    state().saveScene(makeForm({ routeName: '27路' }))
    state().saveScene(makeForm({ routeName: '8路' }))
    expect(state().routeNames).toEqual(['27路', '8路'])
  })

  it('已选线路时保存其他线路的记录，当前筛选视图不混入', () => {
    state().saveScene(makeForm({ routeName: '27路' }))
    state().selectRoute('27路')
    state().saveScene(makeForm({ routeName: '8路' }))
    expect(state().currentRouteScenes.every((s) => s.routeName === '27路')).toBe(true)
    expect(state().scenes).toHaveLength(2)
  })
})

describe('selectRoute 按线路筛选', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T08:00:00Z'))
    state().saveScene(makeForm({ routeName: '27路', note: '最早' }))
    vi.setSystemTime(new Date('2026-09-12T09:00:00Z'))
    state().saveScene(makeForm({ routeName: '8路', note: '中间' }))
    vi.setSystemTime(new Date('2026-09-12T10:00:00Z'))
    state().saveScene(makeForm({ routeName: '27路', note: '最新' }))
  })

  it('筛选指定线路，按时间倒序', () => {
    state().selectRoute('27路')
    expect(state().currentRouteScenes.map((s) => s.note)).toEqual(['最新', '最早'])
  })

  it('空线路名表示全部，按时间倒序', () => {
    state().selectRoute('')
    expect(state().currentRouteScenes.map((s) => s.note)).toEqual(['最新', '中间', '最早'])
  })

  it('切换到无记录的线路得到空列表', () => {
    state().selectRoute('404路')
    expect(state().currentRouteScenes).toEqual([])
  })
})

describe('deleteScene 移除与同步', () => {
  it('移除后 scenes、筛选视图和 localStorage 同步更新', () => {
    state().saveScene(makeForm({ routeName: '27路' }))
    state().saveScene(makeForm({ routeName: '27路' }))
    const target = state().scenes[0]
    state().selectRoute('27路')
    state().deleteScene(target.id)
    expect(state().scenes.map((s) => s.id)).not.toContain(target.id)
    expect(state().currentRouteScenes.map((s) => s.id)).not.toContain(target.id)
    expect(readStorage().map((s) => s.id)).not.toContain(target.id)
    expect(state().scenes).toHaveLength(1)
  })

  it('移除最后一条某线路记录后，该线路从 routeNames 消失', () => {
    state().saveScene(makeForm({ routeName: '8路' }))
    const id = state().scenes[0].id
    state().deleteScene(id)
    expect(state().routeNames).toEqual([])
  })

  it('移除不存在的 id 不影响现有数据', () => {
    state().saveScene(makeForm())
    state().deleteScene('not-exist')
    expect(state().scenes).toHaveLength(1)
    expect(readStorage()).toHaveLength(1)
  })

  it('移除的记录正好是当前随机记录时，randomScene 被清空', () => {
    state().saveScene(makeForm())
    state().refreshRandom()
    const picked = state().randomScene
    expect(picked).not.toBeNull()
    state().deleteScene(picked!.id)
    expect(state().randomScene).toBeNull()
  })

  it('移除其他记录时，当前随机记录保留', () => {
    state().saveScene(makeForm({ routeName: '27路' }))
    state().saveScene(makeForm({ routeName: '8路' }))
    // 固定随机到第一条
    const keep = state().scenes[0]
    useSceneStore.setState({ randomScene: keep })
    const other = state().scenes[1]
    state().deleteScene(other.id)
    expect(state().randomScene?.id).toBe(keep.id)
  })
})

describe('refreshRandom 随机抽取', () => {
  it('无记录时得到 null', () => {
    state().refreshRandom()
    expect(state().randomScene).toBeNull()
  })

  it('只有一条记录时反复抽取仍是它', () => {
    state().saveScene(makeForm())
    state().refreshRandom()
    const first = state().randomScene
    state().refreshRandom()
    expect(state().randomScene?.id).toBe(first?.id)
  })

  it('多条记录时不会连续抽到同一条', () => {
    state().saveScene(makeForm({ note: '一' }))
    state().saveScene(makeForm({ note: '二' }))
    state().refreshRandom()
    for (let i = 0; i < 10; i++) {
      const prev = state().randomScene
      state().refreshRandom()
      expect(state().randomScene).not.toBeNull()
      expect(state().randomScene!.id).not.toBe(prev!.id)
    }
  })

  it('抽到的记录一定来自当前 scenes', () => {
    state().saveScene(makeForm({ routeName: '27路' }))
    state().saveScene(makeForm({ routeName: '8路' }))
    state().refreshRandom()
    const ids = state().scenes.map((s) => s.id)
    expect(ids).toContain(state().randomScene!.id)
  })
})

describe('loadAll 加载', () => {
  it('从 localStorage 恢复记录和线路列表', () => {
    seedStorage([
      {
        id: 'x', routeName: '8路', segment: '火车站 → 北大街', seatDirection: '右',
        timestamp: '2026-09-12T09:00:00.000Z', weather: '阴', signText: '',
        treeDensity: '稀疏', pedestrianStatus: '密集', note: '种子',
      },
    ])
    state().loadAll()
    expect(state().scenes).toHaveLength(1)
    expect(state().routeNames).toEqual(['8路'])
    expect(state().currentRouteScenes).toHaveLength(1)
  })

  it('已选线路时加载后仍按该线路过滤', () => {
    seedStorage([
      {
        id: 'a', routeName: '27路', segment: '甲 → 乙', seatDirection: '左',
        timestamp: '2026-09-12T08:00:00.000Z', weather: '晴', signText: '',
        treeDensity: '适中', pedestrianStatus: '稀少', note: '',
      },
      {
        id: 'b', routeName: '8路', segment: '丙 → 丁', seatDirection: '右',
        timestamp: '2026-09-12T09:00:00.000Z', weather: '阴', signText: '',
        treeDensity: '茂密', pedestrianStatus: '零星', note: '',
      },
    ])
    useSceneStore.setState({ selectedRoute: '27路' })
    state().loadAll()
    expect(state().currentRouteScenes.map((s) => s.id)).toEqual(['a'])
  })

  it('本地存储损坏时加载得到空列表', () => {
    localStorage.setItem(STORAGE_KEY, '{{{corrupted')
    state().loadAll()
    expect(state().scenes).toEqual([])
    expect(state().routeNames).toEqual([])
    expect(state().currentRouteScenes).toEqual([])
  })
})
