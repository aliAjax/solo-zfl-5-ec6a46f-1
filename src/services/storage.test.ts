import { describe, it, expect, beforeEach } from 'vitest'
import type { WindowScene } from '@/types'
import {
  getAllScenes,
  saveScene,
  deleteScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
} from '@/services/storage'

const STORAGE_KEY = 'bus_window_scenes'

let seq = 0
function makeScene(overrides: Partial<WindowScene> = {}): WindowScene {
  seq += 1
  return {
    id: `scene-${seq}`,
    routeName: '27路',
    segment: '钟楼 → 大差市',
    seatDirection: '左',
    timestamp: `2026-09-12T08:0${seq % 10}:00.000Z`,
    weather: '晴',
    signText: '',
    treeDensity: '适中',
    pedestrianStatus: '稀少',
    note: `笔记 ${seq}`,
    ...overrides,
  }
}

function readRaw(): WindowScene[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
}

beforeEach(() => {
  localStorage.clear()
  seq = 0
})

describe('getAllScenes', () => {
  it('无任何数据时返回空列表', () => {
    expect(getAllScenes()).toEqual([])
  })

  it('本地存储损坏（非法 JSON）时返回空列表', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json...')
    expect(getAllScenes()).toEqual([])
  })

  it('本地存储为完全无关的字符串时返回空列表', () => {
    localStorage.setItem(STORAGE_KEY, '这不是 JSON')
    expect(getAllScenes()).toEqual([])
  })
})

describe('saveScene', () => {
  it('保存后立即写入 localStorage', () => {
    const scene = makeScene()
    saveScene(scene)
    expect(readRaw()).toEqual([scene])
    expect(getAllScenes()).toEqual([scene])
  })

  it('连续保存按追加顺序全部保留', () => {
    const a = makeScene({ id: 'a' })
    const b = makeScene({ id: 'b' })
    saveScene(a)
    saveScene(b)
    expect(getAllScenes().map((s) => s.id)).toEqual(['a', 'b'])
    expect(readRaw()).toHaveLength(2)
  })
})

describe('deleteScene', () => {
  it('移除目标记录并立即写回 localStorage', () => {
    const a = makeScene({ id: 'a' })
    const b = makeScene({ id: 'b' })
    saveScene(a)
    saveScene(b)
    deleteScene('a')
    expect(getAllScenes().map((s) => s.id)).toEqual(['b'])
    expect(readRaw().map((s) => s.id)).toEqual(['b'])
  })

  it('移除不存在的 id 时列表保持不变', () => {
    saveScene(makeScene({ id: 'a' }))
    deleteScene('not-exist')
    expect(getAllScenes()).toHaveLength(1)
  })

  it('对空存储执行移除不报错', () => {
    expect(() => deleteScene('a')).not.toThrow()
    expect(getAllScenes()).toEqual([])
  })
})

describe('getScenesByRoute', () => {
  it('只返回指定线路的记录，并按时间倒序', () => {
    saveScene(makeScene({ id: 'old', routeName: '27路', timestamp: '2026-09-12T08:00:00.000Z' }))
    saveScene(makeScene({ id: 'other', routeName: '8路', timestamp: '2026-09-12T09:00:00.000Z' }))
    saveScene(makeScene({ id: 'new', routeName: '27路', timestamp: '2026-09-12T10:00:00.000Z' }))
    const result = getScenesByRoute('27路')
    expect(result.map((s) => s.id)).toEqual(['new', 'old'])
  })

  it('线路名为精确匹配，不做部分匹配', () => {
    saveScene(makeScene({ routeName: '27路' }))
    expect(getScenesByRoute('7路')).toEqual([])
    expect(getScenesByRoute('27')).toEqual([])
  })

  it('查询不存在的线路返回空列表', () => {
    saveScene(makeScene({ routeName: '27路' }))
    expect(getScenesByRoute('404路')).toEqual([])
  })
})

describe('getAllRouteNames', () => {
  it('去重后按字典序返回', () => {
    saveScene(makeScene({ routeName: '27路' }))
    saveScene(makeScene({ routeName: '8路' }))
    saveScene(makeScene({ routeName: '27路' }))
    expect(getAllRouteNames()).toEqual(['27路', '8路'])
  })

  it('空存储返回空列表', () => {
    expect(getAllRouteNames()).toEqual([])
  })
})

describe('getRandomScene', () => {
  it('无记录时返回 null', () => {
    expect(getRandomScene()).toBeNull()
  })

  it('有记录时返回其中一条', () => {
    const a = makeScene({ id: 'a' })
    const b = makeScene({ id: 'b' })
    saveScene(a)
    saveScene(b)
    const picked = getRandomScene()
    expect(['a', 'b']).toContain(picked?.id)
  })
})
