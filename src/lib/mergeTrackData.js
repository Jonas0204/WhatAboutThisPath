import { estimateDurationHours } from './estimateDuration.js'

export function mergeTrackData(index, meta) {
  return index.map((entry) => {
    const manual = meta[entry.id]
    const estimatedHours = estimateDurationHours({
      distanceKm: entry.distanceKm,
      ascentM: entry.ascentM,
      descentM: entry.descentM,
    })

    return {
      id: entry.id,
      sourceFile: entry.sourceFile,
      title: manual?.title ?? entry.displayName,
      region: manual?.region ?? null,
      difficulty: manual?.difficulty ?? null,
      durationHours: manual?.durationHours ?? estimatedHours,
      isEstimatedDuration: manual?.durationHours == null,
      description: manual?.description ?? 'No description yet — add one to trackMeta.json.',
      tags: manual?.tags ?? [],
      bounds: entry.bounds,
      startPoint: entry.startPoint,
      distanceKm: entry.distanceKm,
      ascentM: entry.ascentM,
      descentM: entry.descentM,
      minEle: entry.minEle,
      maxEle: entry.maxEle,
      waypointCount: entry.waypointCount,
    }
  })
}
