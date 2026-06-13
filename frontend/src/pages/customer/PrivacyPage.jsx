import { Link } from 'react-router-dom'
import LegalLayout, { Section } from '../../components/customer/LegalLayout'
import { RESTAURANT } from '../../config/restaurant'

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="13 June 2026">
      <p>
        This Privacy Policy explains how <strong>Absolute Naansense</strong> ("we", "us") collects,
        uses, shares and protects your personal data when you use our online ordering Platform. We
        process personal data in accordance with the Digital Personal Data Protection Act, 2023
        ("DPDP Act"). For the purposes of the Act, Absolute Naansense is the <strong>Data Fiduciary</strong>
        {' '}and you are the <strong>Data Principal</strong>.
      </p>

      <Section heading="1. Information we collect">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Account details:</strong> your name, mobile number and (optionally) email address.</li>
          <li><strong>Order details:</strong> delivery address, items ordered, special requests, pickup times, amounts and tax invoices.</li>
          <li><strong>Payment information:</strong> the payment method and status. We do not store your UPI PIN, card numbers or bank credentials.</li>
          <li><strong>Technical data:</strong> basic device and usage information needed to operate the website securely.</li>
        </ul>
      </Section>

      <Section heading="2. How we use your data">
        <p>We use your personal data only for these specified purposes:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>to create and manage your account;</li>
          <li>to take, prepare, deliver and confirm your orders;</li>
          <li>to issue GST tax invoices and maintain transaction records;</li>
          <li>to provide customer support and respond to your queries;</li>
          <li>to send you order-related updates; and</li>
          <li>to comply with our legal and tax obligations.</li>
        </ul>
      </Section>

      <Section heading="3. Legal basis & consent">
        <p>
          We process your personal data on the basis of the consent you provide when you register and
          place orders, and for certain legitimate uses and legal obligations as permitted under the
          DPDP Act. You may withdraw your consent at any time (see "Your rights" below); withdrawal
          does not affect processing already carried out.
        </p>
      </Section>

      <Section heading="4. Sharing your data">
        <p>
          We do not sell your personal data. We share it only as necessary with: our delivery staff to
          fulfil your order; payment and hosting service providers who process data on our behalf under
          appropriate safeguards; and authorities where required by law. Any Data Processor we engage is
          bound to protect your data and use it only for the purposes we specify.
        </p>
      </Section>

      <Section heading="5. Data retention">
        <p>
          We keep your personal data only for as long as your account is active or as needed to provide
          our services. Records we are legally required to keep — such as invoices and transaction data
          under tax law — are retained for the period prescribed by law and then deleted or anonymised.
        </p>
      </Section>

      <Section heading="6. Your rights as a Data Principal">
        <p>Under the DPDP Act, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Access</strong> — obtain a summary of the personal data we hold about you and how we process it;</li>
          <li><strong>Correction & completion</strong> — have inaccurate or incomplete data corrected or updated;</li>
          <li><strong>Erasure</strong> — request deletion of your personal data where it is no longer needed;</li>
          <li><strong>Withdraw consent</strong> — withdraw the consent you previously gave;</li>
          <li><strong>Grievance redressal</strong> — have your complaints addressed by us; and</li>
          <li><strong>Nomination</strong> — nominate another individual to exercise your rights in the event of your death or incapacity.</li>
        </ul>
        <p>
          To exercise any of these rights, email us at ceoabsolutenaansense@gmail.com. You may also
          update your name, email and saved addresses directly from your Profile.
        </p>
      </Section>

      <Section heading="7. Deleting your account">
        <p>
          You can delete your account at any time from <em>Profile → Delete account</em>. This erases
          your personal data, including saved addresses, from our systems. Records that we are legally
          required to retain (for example, tax invoices) are kept in anonymised form so they can no
          longer be linked to you. You can also request deletion by emailing us.
        </p>
      </Section>

      <Section heading="8. Security">
        <p>
          We take reasonable technical and organisational measures to protect your personal data
          against unauthorised access, loss or misuse. Passwords are stored in hashed form. No method
          of transmission or storage is completely secure, but we work to safeguard your information
          and will notify you and the Data Protection Board of any personal-data breach as required by
          the DPDP Act.
        </p>
      </Section>

      <Section heading="9. Children's data">
        <p>
          The Platform is intended for users aged 18 and above. We do not knowingly process the
          personal data of children. If you believe a child has provided us data, please contact us so
          we can remove it.
        </p>
      </Section>

      <Section heading="10. Grievance Officer">
        <p>
          In accordance with the DPDP Act, you may contact our Grievance Officer for any concern about
          your personal data:
        </p>
        <p>
          <strong>Grievance Officer, Absolute Naansense</strong><br />
          Email: ceoabsolutenaansense@gmail.com<br />
          Phone: {RESTAURANT.mobile}<br />
          Address: {RESTAURANT.address}
        </p>
        <p>
          If you are not satisfied with our response, you may raise the matter with the Data Protection
          Board of India.
        </p>
      </Section>

      <Section heading="11. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. The latest version will always be posted
          here with a revised "Last updated" date.
        </p>
      </Section>

      <Section heading="12. Contact us">
        <p>
          For any privacy question, email ceoabsolutenaansense@gmail.com or call {RESTAURANT.mobile}.
          See also our <Link to="/terms" className="text-brand-600 font-medium hover:underline">Terms &amp; Conditions</Link>.
        </p>
      </Section>
    </LegalLayout>
  )
}
