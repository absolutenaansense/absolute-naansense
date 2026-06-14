import { Link } from 'react-router-dom'
import LegalLayout, { Section } from '../../components/customer/LegalLayout'
import { RESTAURANT } from '../../config/restaurant'

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" updated="13 June 2026">
      <p>
        These Terms &amp; Conditions ("Terms") govern your use of the Absolute Naansense online
        ordering website and services ("Platform"). By creating an account, placing an order, or
        otherwise using the Platform, you agree to be bound by these Terms. Please read them along
        with our <Link to="/privacy" className="text-brand-600 font-medium hover:underline">Privacy Policy</Link>.
      </p>

      <Section heading="1. About us">
        <p>
          The Platform is operated by <strong>Absolute Naansense</strong>, {RESTAURANT.address}.
          GSTIN: {RESTAURANT.gstin}. FSSAI Lic. No.: {RESTAURANT.fssai}. You can reach us at{' '}
          {RESTAURANT.mobile} or by email at ceoabsolutenaansense@gmail.com.
        </p>
      </Section>

      <Section heading="2. Eligibility & accounts">
        <p>
          You must be at least 18 years of age and capable of entering into a binding contract to
          use the Platform. You are responsible for keeping your account credentials secure and for
          all activity under your account. The information you provide during registration must be
          accurate and current.
        </p>
      </Section>

      <Section heading="3. Ordering & service hours">
        <p>
          Delivery and takeaway orders can be placed between <strong>6:00 AM and 11:05 PM IST</strong>.
          Orders placed before 10:00 AM are prepared from 10:00 AM (kitchen opening). Online (UPI)
          payment is available until 10:59 PM; after that, orders are Cash on delivery only. All orders
          are subject to acceptance and availability. We may refuse or cancel an order at our discretion,
          including where items are unavailable or where we are unable to serve your location.
        </p>
      </Section>

      <Section heading="4. Prices, taxes & payment">
        <p>
          Prices are listed in Indian Rupees (₹). Applicable GST (CGST 2.5% + SGST 2.5%) is charged
          as shown at checkout and on your tax invoice. A delivery fee may apply to delivery orders
          below the free-delivery threshold; takeaway orders carry no delivery fee. We accept Cash on
          Delivery and UPI/prepaid payment as offered at checkout.
        </p>
      </Section>

      <Section heading="5. Order confirmation, changes & cancellation">
        <p>
          <strong>Orders once placed cannot be modified or cancelled by the customer</strong>, as
          preparation begins promptly. Save in the case of a defect in the food or an error on our
          part, orders are non-cancellable and non-refundable. Where a refund is due, it will be
          processed to the original payment method within a reasonable period.
        </p>
      </Section>

      <Section heading="6. Delivery & takeaway">
        <p>
          Estimated delivery and pickup times are indicative and not guaranteed. For takeaway, please
          collect your order at the chosen pickup time. Risk in the food passes to you on delivery or
          collection.
        </p>
      </Section>

      <Section heading="7. Food information & allergens">
        <p>
          We prepare food in a kitchen that handles a range of ingredients including dairy, gluten,
          nuts and other allergens. While we take care, we cannot guarantee that any item is free of
          a particular allergen. If you have an allergy or dietary requirement, please contact us
          before ordering.
        </p>
      </Section>

      <Section heading="8. Acceptable use">
        <p>
          You agree not to misuse the Platform, including placing fraudulent or abusive orders,
          attempting to gain unauthorised access, interfering with its operation, or using it for any
          unlawful purpose.
        </p>
      </Section>

      <Section heading="9. Intellectual property">
        <p>
          All content on the Platform — including the name, logo, menu, images and text — belongs to
          Absolute Naansense and may not be copied or used without our written permission.
        </p>
      </Section>

      <Section heading="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, our total liability arising out of any order is
          limited to the value of that order. We are not liable for indirect or consequential losses.
          Nothing in these Terms excludes liability that cannot be excluded under applicable law.
        </p>
      </Section>

      <Section heading="11. Data protection (Digital Personal Data Protection Act, 2023)">
        <p>
          Absolute Naansense acts as a <strong>Data Fiduciary</strong> in respect of the personal
          data you provide, and processes it in accordance with the Digital Personal Data Protection
          Act, 2023 ("DPDP Act") and rules made under it. By using the Platform you consent to such
          processing for the purposes set out below and in our Privacy Policy.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Purpose &amp; consent:</strong> We collect and process your name, mobile number,
            email, delivery address and order history solely to register your account, take and
            deliver your orders, issue tax invoices, provide support, and meet legal obligations. We
            process this data on the basis of the consent you give at registration, which you may
            withdraw at any time.
          </li>
          <li>
            <strong>Data minimisation &amp; purpose limitation:</strong> We collect only the data
            necessary for these purposes and do not use it for unrelated purposes.
          </li>
          <li>
            <strong>Your rights as a Data Principal:</strong> You have the right to access a summary
            of your personal data and processing, to seek correction or completion, to seek erasure
            of your personal data, to nominate another individual to exercise your rights in the event
            of death or incapacity, and to grievance redressal.
          </li>
          <li>
            <strong>Right to erasure &amp; account deletion:</strong> You may delete your account at
            any time from <em>Profile → Delete account</em>. On deletion we erase your personal data,
            except records (such as tax invoices and transaction history) that we are required to
            retain under applicable law, which are kept in anonymised form.
          </li>
          <li>
            <strong>Withdrawal of consent:</strong> You may withdraw your consent at any time, on
            which we will stop processing your personal data unless retention is legally required.
            Withdrawal does not affect processing carried out before withdrawal.
          </li>
          <li>
            <strong>Grievances:</strong> For any data-protection question or complaint, contact our
            Grievance Officer at ceoabsolutenaansense@gmail.com. Details of how we handle your data
            are in our <Link to="/privacy" className="text-brand-600 font-medium hover:underline">Privacy Policy</Link>.
          </li>
        </ul>
      </Section>

      <Section heading="12. Governing law & jurisdiction">
        <p>
          These Terms are governed by the laws of India. The courts at Sonebhadra, Uttar Pradesh shall
          have exclusive jurisdiction over any dispute arising from them.
        </p>
      </Section>

      <Section heading="13. Changes to these Terms">
        <p>
          We may update these Terms from time to time. The updated version will be posted here with a
          revised "Last updated" date, and your continued use of the Platform constitutes acceptance.
        </p>
      </Section>

      <Section heading="14. Contact">
        <p>
          Questions about these Terms? Email ceoabsolutenaansense@gmail.com or call {RESTAURANT.mobile}.
        </p>
      </Section>
    </LegalLayout>
  )
}
