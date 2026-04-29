import { describe, expect, it } from 'vitest'
import { buildStationSource, normalizeStationContext } from '@/utils/stationContext'

describe('stationContext', () => {
  it('normalizes empty station context to browser defaults', () => {
    expect(normalizeStationContext({})).toEqual({
      stationName: '未配置工位',
      stationArea: '未配置区域',
      deviceLabel: '浏览器终端',
    })
  })

  it('builds audit metadata for h5 station records', () => {
    const source = buildStationSource({
      stationName: '内包工位 1',
      stationArea: '包装间',
      deviceLabel: 'PDA-01',
    })

    expect(source).toEqual({
      source: 'h5_station',
      stationName: '内包工位 1',
      stationArea: '包装间',
      deviceLabel: 'PDA-01',
    })
  })
})
