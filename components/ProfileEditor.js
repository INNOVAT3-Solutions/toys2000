'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getShipToRecordId } from '@/lib/build-markettime-order';
import {
  formatSalespersonAddress,
  formatSalespersonPhone,
} from '@/lib/customer-salesperson';
import { PROFILE_INPUT_CLASS } from '@/lib/profile-form';

function getContactRecordId(contact) {
  if (!contact) return null;
  const id = contact.recordID ?? contact.id;
  if (id == null || id === '') return null;
  return String(id);
}

function formatAddress({ address1, address2, city, state, zip, country }) {
  const line1 = [address1, address2].filter(Boolean).join(', ');
  const line2 = [city, state, zip].filter(Boolean).join(', ');
  const parts = [line1, line2, country].filter(Boolean);
  return parts.length ? parts : null;
}

function getAccountStatusBadges(customer, portalApproved) {
  const badges = [];

  if (customer?.approved) {
    badges.push({ label: 'Approved to order', active: true });
  }

  const lifecycle = customer?.retailerStatus || customer?.status;
  if (lifecycle) {
    badges.push({
      label: lifecycle.replace(/_/g, ' '),
      active: lifecycle === 'ACTIVE',
    });
  } else if (customer?.active === false) {
    badges.push({ label: 'Inactive', active: false });
  }

  if (!portalApproved) {
    badges.push({ label: 'Portal pending', active: false });
  }

  return badges;
}

function StatusBadge({ label, active }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        active
          ? 'bg-green-100 text-green-800'
          : 'bg-amber-100 text-amber-900'
      }`}
    >
      {label}
    </span>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#1a1d26] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ReadOnlyRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#5f6980]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[#1a1d26]">{value}</dd>
    </div>
  );
}

function ContactLink({ href, children }) {
  if (!href || !children) return null;

  return (
    <a href={href} className="text-[#00aeef] hover:underline">
      {children}
    </a>
  );
}

function SalespersonSection({ salespeople }) {
  if (!salespeople?.length) return null;

  return (
    <section className="bg-white rounded-2xl border border-black/[0.06] p-6">
      <h2 className="text-lg font-bold text-[#1a1d26] mb-1">Your sales representative</h2>
      <p className="text-sm text-[#5f6980] mb-4">
        Assigned to your account in MarketTime. Reach out with questions about orders, pricing, or account setup.
      </p>

      <ul className="space-y-4">
        {salespeople.map((person) => {
          const phone = formatSalespersonPhone(person);
          const address = formatSalespersonAddress(person);
          const phoneDigits = phone?.replace(/\D/g, '');

          return (
            <li
              key={person.recordID}
              className="border border-black/[0.06] rounded-xl p-4"
            >
              <p className="font-semibold text-[#1a1d26]">{person.name}</p>

              <dl className="mt-3 grid sm:grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#5f6980]">Email</dt>
                  <dd className="mt-0.5 text-sm">
                    {person.email ? (
                      <ContactLink href={`mailto:${person.email}`}>{person.email}</ContactLink>
                    ) : (
                      <span className="text-[#5f6980]">Not provided</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#5f6980]">Phone</dt>
                  <dd className="mt-0.5 text-sm">
                    {phone ? (
                      <ContactLink href={phoneDigits ? `tel:${phoneDigits}` : undefined}>
                        {phone}
                      </ContactLink>
                    ) : (
                      <span className="text-[#5f6980]">Not provided</span>
                    )}
                  </dd>
                </div>

                {person.cell && person.cell !== phone && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#5f6980]">Mobile</dt>
                    <dd className="mt-0.5 text-sm">
                      <ContactLink href={`tel:${person.cell.replace(/\D/g, '')}`}>
                        {person.cell}
                      </ContactLink>
                    </dd>
                  </div>
                )}
              </dl>

              {address && (
                <div className="mt-4 border-t border-black/[0.06] pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5f6980]">Office</p>
                  <address className="not-italic text-sm text-[#1a1d26] mt-1 leading-relaxed">
                    {address.map((line) => (
                      <span key={line} className="block">{line}</span>
                    ))}
                  </address>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EditButton({ onClick, label = 'Edit' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-[#1a1d26] hover:bg-[#f7f8fa]"
    >
      {label}
    </button>
  );
}

function SaveCancelActions({ onCancel, saving, saveLabel }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-[#5f6980] hover:bg-[#f7f8fa] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2 rounded-lg bg-[#f15a24] text-white text-sm font-semibold hover:bg-[#d94e1f] disabled:opacity-60"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  );
}

async function saveProfileSection({ url, body, successMessage, onSuccess }) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Could not save changes');
  }

  toast.success(successMessage);
  onSuccess?.(data);
  return data;
}

function customerFormState(customer) {
  return {
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    website: customer?.website ?? '',
    address1: customer?.address1 ?? '',
    address2: customer?.address2 ?? '',
    city: customer?.city ?? '',
    state: customer?.state ?? '',
    zip: customer?.zip ?? '',
    country: customer?.country ?? 'US',
  };
}

function shipToFormState(shipTo) {
  return {
    name: shipTo?.name ?? '',
    email: shipTo?.email ?? '',
    phone: shipTo?.phone ?? '',
    address1: shipTo?.address1 ?? '',
    address2: shipTo?.address2 ?? '',
    city: shipTo?.city ?? '',
    state: shipTo?.state ?? '',
    zip: shipTo?.zip ?? '',
    country: shipTo?.country ?? 'US',
    isPrimary: Boolean(shipTo?.isPrimary),
  };
}

function contactFormState(contact) {
  return {
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    title: contact?.title ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone || contact?.cell || '',
    isPrimary: Boolean(contact?.isPrimary),
  };
}

export default function ProfileEditor({
  retailerId,
  portalLoginEmail,
  portalApproved,
  initialCustomer,
  initialContacts,
  initialShipTos,
  initialSalespeople = [],
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);
  const [contacts, setContacts] = useState(initialContacts);
  const [shipTos, setShipTos] = useState(initialShipTos);

  const [companyForm, setCompanyForm] = useState(() => customerFormState(initialCustomer));
  const [contactForms, setContactForms] = useState(() =>
    initialContacts.map((contact) => contactFormState(contact))
  );
  const [shipToForms, setShipToForms] = useState(() =>
    initialShipTos.map((shipTo) => shipToFormState(shipTo))
  );

  const [editingCompany, setEditingCompany] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editingShipToId, setEditingShipToId] = useState(null);

  const [savingCompany, setSavingCompany] = useState(false);
  const [savingContactId, setSavingContactId] = useState(null);
  const [savingShipToId, setSavingShipToId] = useState(null);

  const statusBadges = useMemo(
    () => getAccountStatusBadges(customer, portalApproved),
    [customer, portalApproved]
  );

  const billingAddress = customer ? formatAddress(customer) : null;

  const updateCompanyField = (field, value) => {
    setCompanyForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateContactField = (index, field, value) => {
    setContactForms((prev) => prev.map((form, i) => (
      i === index ? { ...form, [field]: value } : form
    )));
  };

  const updateShipToField = (index, field, value) => {
    setShipToForms((prev) => prev.map((form, i) => (
      i === index ? { ...form, [field]: value } : form
    )));
  };

  const startEditingCompany = () => {
    setCompanyForm(customerFormState(customer));
    setEditingCompany(true);
  };

  const cancelEditingCompany = () => {
    setCompanyForm(customerFormState(customer));
    setEditingCompany(false);
  };

  const startEditingContact = (index) => {
    const contactId = getContactRecordId(contacts[index]);
    setContactForms((prev) => prev.map((form, i) => (
      i === index ? contactFormState(contacts[index]) : form
    )));
    setEditingContactId(contactId);
  };

  const cancelEditingContact = (index) => {
    setContactForms((prev) => prev.map((form, i) => (
      i === index ? contactFormState(contacts[index]) : form
    )));
    setEditingContactId(null);
  };

  const startEditingShipTo = (index) => {
    const shipToId = getShipToRecordId(shipTos[index]);
    setShipToForms((prev) => prev.map((form, i) => (
      i === index ? shipToFormState(shipTos[index]) : form
    )));
    setEditingShipToId(String(shipToId));
  };

  const cancelEditingShipTo = (index) => {
    setShipToForms((prev) => prev.map((form, i) => (
      i === index ? shipToFormState(shipTos[index]) : form
    )));
    setEditingShipToId(null);
  };

  const handleSaveCompany = async (event) => {
    event.preventDefault();
    setSavingCompany(true);
    try {
      const data = await saveProfileSection({
        url: '/api/profile/customer',
        body: companyForm,
        successMessage: 'Company profile updated in MarketTime',
        onSuccess: () => router.refresh(),
      });
      if (data.customer) setCustomer(data.customer);
      setEditingCompany(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveContact = async (index, event) => {
    event.preventDefault();
    const contact = contacts[index];
    const contactId = getContactRecordId(contact);
    if (!contactId) {
      toast.error('Missing contact ID');
      return;
    }

    setSavingContactId(contactId);
    try {
      const data = await saveProfileSection({
        url: `/api/profile/contact/${contactId}`,
        body: contactForms[index],
        successMessage: 'Contact updated in MarketTime',
        onSuccess: () => router.refresh(),
      });
      if (data.contact) {
        setContacts((prev) => prev.map((item, i) => (i === index ? data.contact : item)));
      }
      setEditingContactId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingContactId(null);
    }
  };

  const handleSaveShipTo = async (index, event) => {
    event.preventDefault();
    const shipTo = shipTos[index];
    const shipToId = getShipToRecordId(shipTo);
    if (!shipToId) {
      toast.error('Missing ship-to ID');
      return;
    }

    setSavingShipToId(String(shipToId));
    try {
      const data = await saveProfileSection({
        url: `/api/profile/shipto/${shipToId}`,
        body: shipToForms[index],
        successMessage: 'Ship-to location updated in MarketTime',
        onSuccess: () => router.refresh(),
      });
      if (data.shipTo) {
        setShipTos((prev) => prev.map((item, i) => (i === index ? data.shipTo : item)));
      }
      setEditingShipToId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingShipToId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-black/[0.06] p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1a1d26]">Company & billing</h2>
            <p className="text-xs text-[#5f6980] mt-0.5">Customer ID: {retailerId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusBadges.map((badge) => (
              <StatusBadge key={badge.label} label={badge.label} active={badge.active} />
            ))}
            {!editingCompany && <EditButton onClick={startEditingCompany} />}
          </div>
        </div>

        {editingCompany ? (
          <form onSubmit={handleSaveCompany} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Company name" className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={(e) => updateCompanyField('name', e.target.value)}
                  className={PROFILE_INPUT_CLASS}
                />
              </Field>
              <Field label="Company email">
                <input
                  type="email"
                  required
                  value={companyForm.email}
                  onChange={(e) => updateCompanyField('email', e.target.value)}
                  className={PROFILE_INPUT_CLASS}
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => updateCompanyField('phone', e.target.value)}
                  className={PROFILE_INPUT_CLASS}
                />
              </Field>
              <Field label="Website">
                <input
                  type="url"
                  value={companyForm.website}
                  onChange={(e) => updateCompanyField('website', e.target.value)}
                  placeholder="https://"
                  className={PROFILE_INPUT_CLASS}
                />
              </Field>
              <ReadOnlyRow
                label="Customer number"
                value={customer?.customerNumber || customer?.externalID}
              />
            </div>

            <div className="border-t border-black/[0.06] pt-5">
              <h3 className="text-sm font-bold text-[#1a1d26] mb-4">Billing address</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Street address" className="sm:col-span-2">
                  <input
                    type="text"
                    value={companyForm.address1}
                    onChange={(e) => updateCompanyField('address1', e.target.value)}
                    className={PROFILE_INPUT_CLASS}
                  />
                </Field>
                <Field label="Suite / unit" className="sm:col-span-2">
                  <input
                    type="text"
                    value={companyForm.address2}
                    onChange={(e) => updateCompanyField('address2', e.target.value)}
                    className={PROFILE_INPUT_CLASS}
                  />
                </Field>
                <Field label="City">
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => updateCompanyField('city', e.target.value)}
                    className={PROFILE_INPUT_CLASS}
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text"
                    required
                    value={companyForm.state}
                    onChange={(e) => updateCompanyField('state', e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="FL"
                    className={PROFILE_INPUT_CLASS}
                  />
                </Field>
                <Field label="ZIP">
                  <input
                    type="text"
                    value={companyForm.zip}
                    onChange={(e) => updateCompanyField('zip', e.target.value)}
                    className={PROFILE_INPUT_CLASS}
                  />
                </Field>
                <Field label="Country">
                  <input
                    type="text"
                    required
                    value={companyForm.country}
                    onChange={(e) => updateCompanyField('country', e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="US"
                    className={PROFILE_INPUT_CLASS}
                  />
                </Field>
              </div>
            </div>

            <SaveCancelActions
              onCancel={cancelEditingCompany}
              saving={savingCompany}
              saveLabel="Save changes"
            />
          </form>
        ) : (
          <>
            <dl className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <ReadOnlyRow label="Company name" value={customer?.name} />
              </div>
              <ReadOnlyRow label="Company email" value={customer?.email} />
              <ReadOnlyRow label="Phone" value={customer?.phone} />
              <ReadOnlyRow label="Website" value={customer?.website} />
              <ReadOnlyRow
                label="Customer number"
                value={customer?.customerNumber || customer?.externalID}
              />
              <ReadOnlyRow label="Portal login email" value={portalLoginEmail} />
            </dl>

            {billingAddress && (
              <div className="border-t border-black/[0.06] pt-5">
                <h3 className="text-sm font-bold text-[#1a1d26] mb-3">Billing address</h3>
                <address className="not-italic text-sm text-[#1a1d26] leading-relaxed">
                  {billingAddress.map((line) => (
                    <span key={line} className="block">{line}</span>
                  ))}
                </address>
              </div>
            )}
          </>
        )}

        {!editingCompany && portalLoginEmail && customer?.email
          && portalLoginEmail.toLowerCase() !== customer.email.toLowerCase() && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Your portal login email differs from your MarketTime company email. Orders use your MarketTime company email.
          </p>
        )}
      </section>

      <SalespersonSection salespeople={initialSalespeople} />

      {contacts.length > 0 && (
        <section className="bg-white rounded-2xl border border-black/[0.06] p-6">
          <h2 className="text-lg font-bold text-[#1a1d26] mb-4">Contacts</h2>
          <ul className="space-y-4">
            {contacts.map((contact, index) => {
              const contactId = getContactRecordId(contact);
              const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Contact';
              const form = contactForms[index];
              const isEditing = editingContactId === contactId;

              return (
                <li
                  key={contactId ?? name}
                  className="border border-black/[0.06] rounded-xl p-4 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#1a1d26]">{name}</p>
                    <div className="flex items-center gap-2">
                      {contact.isPrimary && (
                        <span className="text-xs font-semibold text-[#00aeef]">Primary</span>
                      )}
                      {!isEditing && <EditButton onClick={() => startEditingContact(index)} />}
                    </div>
                  </div>

                  {isEditing ? (
                    <form onSubmit={(e) => handleSaveContact(index, e)} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="First name">
                          <input
                            type="text"
                            required
                            value={form.firstName}
                            onChange={(e) => updateContactField(index, 'firstName', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Last name">
                          <input
                            type="text"
                            value={form.lastName}
                            onChange={(e) => updateContactField(index, 'lastName', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Title">
                          <input
                            type="text"
                            value={form.title}
                            onChange={(e) => updateContactField(index, 'title', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => updateContactField(index, 'email', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Phone">
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => updateContactField(index, 'phone', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                      </div>

                      <SaveCancelActions
                        onCancel={() => cancelEditingContact(index)}
                        saving={savingContactId === contactId}
                        saveLabel="Save contact"
                      />
                    </form>
                  ) : (
                    <dl className="grid sm:grid-cols-2 gap-2">
                      <ReadOnlyRow label="Email" value={contact.email} />
                      <ReadOnlyRow label="Phone" value={contact.phone || contact.cell} />
                      <ReadOnlyRow label="Title" value={contact.title} />
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {shipTos.length > 0 && (
        <section className="bg-white rounded-2xl border border-black/[0.06] p-6">
          <h2 className="text-lg font-bold text-[#1a1d26] mb-4">Ship-to locations</h2>
          <ul className="space-y-4">
            {shipTos.map((shipTo, index) => {
              const shipToId = getShipToRecordId(shipTo);
              const form = shipToForms[index];
              const isEditing = editingShipToId === String(shipToId);
              const address = formatAddress(shipTo);

              return (
                <li
                  key={shipToId ?? shipTo.name}
                  className="border border-black/[0.06] rounded-xl p-4 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#1a1d26]">{shipTo.name}</p>
                    <div className="flex items-center gap-2">
                      {shipTo.isPrimary && (
                        <span className="text-xs font-semibold text-[#00aeef]">Primary</span>
                      )}
                      {!isEditing && <EditButton onClick={() => startEditingShipTo(index)} />}
                    </div>
                  </div>

                  {isEditing ? (
                    <form onSubmit={(e) => handleSaveShipTo(index, e)} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Location name" className="sm:col-span-2">
                          <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => updateShipToField(index, 'name', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => updateShipToField(index, 'email', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Phone">
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => updateShipToField(index, 'phone', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Street address" className="sm:col-span-2">
                          <input
                            type="text"
                            required
                            value={form.address1}
                            onChange={(e) => updateShipToField(index, 'address1', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Suite / unit" className="sm:col-span-2">
                          <input
                            type="text"
                            value={form.address2}
                            onChange={(e) => updateShipToField(index, 'address2', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="City">
                          <input
                            type="text"
                            required
                            value={form.city}
                            onChange={(e) => updateShipToField(index, 'city', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="State">
                          <input
                            type="text"
                            required
                            value={form.state}
                            onChange={(e) => updateShipToField(index, 'state', e.target.value.toUpperCase())}
                            maxLength={2}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="ZIP">
                          <input
                            type="text"
                            required
                            value={form.zip}
                            onChange={(e) => updateShipToField(index, 'zip', e.target.value)}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                        <Field label="Country">
                          <input
                            type="text"
                            required
                            value={form.country}
                            onChange={(e) => updateShipToField(index, 'country', e.target.value.toUpperCase())}
                            maxLength={2}
                            className={PROFILE_INPUT_CLASS}
                          />
                        </Field>
                      </div>

                      <SaveCancelActions
                        onCancel={() => cancelEditingShipTo(index)}
                        saving={savingShipToId === String(shipToId)}
                        saveLabel="Save ship-to"
                      />
                    </form>
                  ) : (
                    <>
                      {address && (
                        <address className="not-italic text-sm text-[#1a1d26] leading-relaxed">
                          {address.map((line) => (
                            <span key={line} className="block">{line}</span>
                          ))}
                        </address>
                      )}
                      <dl className="grid sm:grid-cols-2 gap-2">
                        <ReadOnlyRow label="Email" value={shipTo.email} />
                        <ReadOnlyRow label="Phone" value={shipTo.phone} />
                      </dl>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-xs text-[#5f6980] text-center">
        Changes are saved directly to your MarketTime account and used for future orders.
      </p>
    </div>
  );
}
