import { describe, it, expect } from 'vitest'
import { setLogicRandomSeed, logicRandom, getLogicRandomCallCount } from './logicRng'
import { RAIN_PER_NIGHT, addFold, segmentHitsBlock, waterPot } from './SampleGame'

function drawSequence(n: number): number[] {
    return Array.from({ length: n }, () => logicRandom())
}

describe('logicRandom', () => {
    it('same seed reproduces the same sequence (smoke-test contract)', () => {
        setLogicRandomSeed('42')
        const first = drawSequence(10)
        setLogicRandomSeed('42')
        const second = drawSequence(10)
        expect(second).toEqual(first)
    })

    it('different seeds produce different sequences', () => {
        setLogicRandomSeed('a')
        const a = drawSequence(10)
        setLogicRandomSeed('b')
        const b = drawSequence(10)
        expect(b).not.toEqual(a)
    })

    it('numeric and string forms of the same seed are equivalent', () => {
        setLogicRandomSeed(7)
        const numeric = drawSequence(5)
        setLogicRandomSeed('7')
        const stringy = drawSequence(5)
        expect(stringy).toEqual(numeric)
    })

    it('values stay within [0, 1)', () => {
        setLogicRandomSeed('range')
        for (const v of drawSequence(1000)) {
            expect(v).toBeGreaterThanOrEqual(0)
            expect(v).toBeLessThan(1)
        }
    })

    it('tracks call count and resets it on reseed', () => {
        setLogicRandomSeed('count')
        drawSequence(3)
        expect(getLogicRandomCallCount()).toBe(3)
        setLogicRandomSeed('count')
        expect(getLogicRandomCallCount()).toBe(0)
    })
})

describe('Fold the Rain rules', () => {
    it('locks every night to exactly 72 drops', () => {
        expect(RAIN_PER_NIGHT).toBe(72)
    })

    it('rejects folds crossing a building but accepts empty space', () => {
        const building = { x: 100, y: 500, w: 120, h: 344 }
        expect(segmentHitsBlock({ x: 40, y: 600 }, { x: 300, y: 600 }, building)).toBe(true)
        expect(segmentHitsBlock({ x: 30, y: 300 }, { x: 350, y: 380 }, building)).toBe(false)
    })

    it('marks only the oldest fold for unfolding when a fourth is added', () => {
        const line = (born: number) => ({ a: { x: 10, y: born }, b: { x: 80, y: born }, born })
        const folds = addFold([line(1), line(2), line(3)], line(4))
        expect(folds).toHaveLength(4)
        expect(folds.filter(f => f.fading).map(f => f.born)).toEqual([1])
    })

    it('blooms at the required water count and passes later water unchanged', () => {
        let pot = { x: 10, y: 10, need: 2, water: 0, bloomed: false }
        pot = waterPot(pot)
        expect(pot.bloomed).toBe(false)
        pot = waterPot(pot)
        expect(pot.bloomed).toBe(true)
        expect(waterPot(pot)).toEqual(pot)
    })
})
