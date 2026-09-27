import type { StorefrontMatrixAxis, StorefrontVariant } from '@/api/types'
import { cx } from '@/lib/cx'
import { resolveColorHex } from '../utils/colorSwatch'
import {
  availableAxisValues,
  type VariantSelection,
} from '../utils/variantSelection'
import styles from './VariantSelector.module.css'

interface VariantSelectorProps {
  axes: StorefrontMatrixAxis[]
  variants: StorefrontVariant[]
  selection: VariantSelection
  onChange: (axisName: string, value: string) => void
}

export function VariantSelector({ axes, variants, selection, onChange }: VariantSelectorProps) {
  return (
    <div className={styles.selector}>
      {axes.map((axis) => {
        const values = availableAxisValues(axis, axes, variants, selection)
        const isColor = axis.type === 'color'

        return (
          <fieldset key={axis.name} className={styles.group}>
            <legend className={styles.legend}>
              {axis.name}
              {!isColor && selection[axis.name] ? (
                <span className={styles.legendValue}>{selection[axis.name]}</span>
              ) : null}
            </legend>
            <div className={isColor ? styles.swatches : styles.options}>
              {values.map((value) => {
                const selected = selection[axis.name] === value

                if (isColor) {
                  const hex = resolveColorHex(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      title={value}
                      aria-label={`${axis.name}: ${value}`}
                      aria-pressed={selected}
                      className={cx(styles.swatch, selected && styles.swatchActive)}
                      style={hex ? { backgroundColor: hex } : undefined}
                      onClick={() => onChange(axis.name, value)}
                    >
                      {hex ? null : value}
                    </button>
                  )
                }

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    className={cx(styles.option, selected && styles.optionActive)}
                    onClick={() => onChange(axis.name, value)}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
