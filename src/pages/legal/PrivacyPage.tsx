import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { selectStorefrontName } from '@/store/storefrontSlice'
import { useAppSelector } from '@/store/hooks'
import styles from './PrivacyPage.module.css'

export function PrivacyPage() {
  const storeName = useAppSelector(selectStorefrontName)

  useDocumentTitle(`Política de tratamiento de datos · ${storeName}`)

  return (
    <div className={styles.page}>
      <nav aria-label="Ruta de navegación" className={styles.breadcrumb}>
        <Link to="/">Catálogo</Link>
        <span aria-hidden="true">›</span>
        <span className={styles.current}>Política de tratamiento de datos</span>
      </nav>

      <article className={styles.article}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Legal</p>
          <h1 className={styles.title}>Política de tratamiento de datos personales</h1>
          <p className={styles.lead}>
            Esta política explica qué datos personales tratamos cuando realizas un pedido en
            esta tienda en línea, con qué finalidad y cómo puedes ejercer tus derechos.
          </p>
          <p className={styles.updated}>Última actualización: septiembre de 2026.</p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Responsable del tratamiento</h2>
          <p>
            El responsable de tus datos personales es <strong>EcuNexo</strong>, en su calidad de
            operador de esta vitrina y de la plataforma que procesa los pedidos. La tienda
            publicada en este sitio es la encargada de la relación comercial contigo.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Finalidad del tratamiento</h2>
          <p>Usamos tus datos únicamente para gestionar tu pedido, en particular para:</p>
          <ul className={styles.list}>
            <li>Confirmar, preparar y entregar el pedido en la dirección indicada.</li>
            <li>Coordinar el pago y el envío con el comprador y la transportadora.</li>
            <li>Emitir comprobantes de venta cuando corresponda.</li>
            <li>Atender consultas, garantías, devoluciones o reclamos del pedido.</li>
            <li>Enviarte avisos estrictamente relacionados con tu compra.</li>
          </ul>
          <p>
            No usamos tus datos para publicidad, perfilado ni venta a terceros, salvo que
            otorgues un consentimiento adicional.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos que recopilamos</h2>
          <p>Al completar el checkout capturamos:</p>
          <ul className={styles.list}>
            <li>Nombre completo.</li>
            <li>Correo electrónico.</li>
            <li>Teléfono de contacto.</li>
            <li>Cédula o RUC (opcional).</li>
            <li>Dirección, ciudad y referencia de entrega.</li>
            <li>Detalle de los productos, cantidades e importes del pedido.</li>
          </ul>
          <p>
            No solicitamos datos sensibles ni información financiera: los pagos se coordinan por
            los medios indicados al finalizar la compra.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Base legal</h2>
          <p>
            El tratamiento se basa en la ejecución de la relación contractual de compraventa, en
            el consentimiento que otorgas al aceptar esta política antes de confirmar el pedido y
            en el cumplimiento de obligaciones legales y tributarias aplicables en Ecuador,
            incluida la Ley Orgánica de Protección de Datos Personales (LOPDP).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Conservación</h2>
          <p>
            Conservamos tus datos mientras exista la relación comercial y durante los plazos
            legales de conservación de documentos tributarios y contables. Cumplido ese plazo,
            los eliminamos o anonimizamos de forma segura.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Derechos del titular</h2>
          <p>
            Puedes solicitar el acceso, la rectificación, la eliminación, la oposición, la
            portabilidad o la suspensión del tratamiento de tus datos personales. Para ejercerlos,
            contacta a la tienda a través del canal de atención publicado en este sitio o al
            responsable de privacidad de EcuNexo, adjuntando tu solicitud e identificación.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contacto</h2>
          <p>
            Si tienes dudas sobre esta política o sobre el tratamiento de tus datos, escríbenos a
            través del teléfono o WhatsApp de atención de la tienda publicado en la vitrina.
            Responderemos en los plazos previstos por la normativa aplicable.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Almacenamiento local en tu navegador</h2>
          <p>
            Esta tienda <strong>no utiliza cookies de publicidad ni de rastreo</strong>. Para
            recordar tu experiencia de compra guardamos algunos datos directamente en el{' '}
            <code className={styles.code}>localStorage</code> de tu navegador:
          </p>
          <ul className={styles.list}>
            <li>
              <strong>Tu carrito</strong> (<code className={styles.code}>ecunexo.cart.v1</code>),
              para que los productos no se pierdan si recargas la página.
            </li>
            <li>
              <strong>Los productos que te gustaron</strong> (
              <code className={styles.code}>ecunexo.likes.v1</code>), para mostrarte tu reacción
              en el catálogo.
            </li>
            <li>
              <strong>Un identificador anónimo de visitante</strong> (
              <code className={styles.code}>ecunexo.visitor.v1</code>), que evita duplicar el
              registro de un mismo «me gusta».
            </li>
          </ul>
          <p>
            Esta información permanece en tu dispositivo, no identifica tu persona y puedes
            borrarla en cualquier momento desde la configuración de tu navegador (limpiar datos
            de sitios, cookies y almacenamiento local). Si la eliminas, el carrito y los gustados
            se reinician.
          </p>
        </section>
      </article>
    </div>
  )
}
