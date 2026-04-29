export interface StationContext {
  stationName: string
  stationArea: string
  deviceLabel: string
}

export interface StationSource extends StationContext {
  source: 'h5_station'
}

export function normalizeStationContext(input: Partial<StationContext> | null | undefined): StationContext {
  return {
    stationName: input?.stationName?.trim() || '未配置工位',
    stationArea: input?.stationArea?.trim() || '未配置区域',
    deviceLabel: input?.deviceLabel?.trim() || '浏览器终端',
  }
}

export function buildStationSource(input: Partial<StationContext> | null | undefined): StationSource {
  return {
    source: 'h5_station',
    ...normalizeStationContext(input),
  }
}
