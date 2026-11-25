import { useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectStorefrontColorPalette } from '@/store/storefrontSlice'
import { createColorPaletteLookup, type ColorPaletteLookup } from '../utils/colorSwatch'

export function useColorPalette(): ColorPaletteLookup {
  const palette = useAppSelector(selectStorefrontColorPalette)
  return useMemo(() => createColorPaletteLookup(palette), [palette])
}
