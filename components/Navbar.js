import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import styles from './Navbar.module.css';

import { useRouter } from 'next/router';
import { logoutUser } from '@/supabase/userUtility';
import { Accordion, AccordionItem, Avatar, Button, Divider } from '@nextui-org/react';
import { useNMNContext } from './NMNContext';
import { toast } from 'react-hot-toast';
import { Lock } from 'lucide-react';

/**
 * Navbar — Phase 1.8
 *
 *   1. Hides parent subtitles (cleaner look matching the preview)
 *   2. Groups parent items into three sections — STUDY / RESOURCES / YOU —
 *      with small uppercase labels above each, exactly like the preview.
 *
 * The Accordion behaviour underneath is unchanged: click a parent to expand
 * its sub-items, active sub-item gets the soft purple tint.
 */

// Section grouping — parent titles → display section
const SECTIONS = [
  // Phase 16 Ship A: shorter labels (Option C) — titles match the new ones in NMNContext.js navitems.
  {
    label: 'Study',
    titles: ['Dashboard', 'Classes', 'Tests', 'DSB Challenge'],
  },
  {
    label: 'Resources',
    titles: ['Doubts', 'Videos', 'PYQ Papers'],
  },
  {
    label: 'You',
    titles: ['My Plan'],
  },
];

const Navbar = ({ type, changePage, accordian, currentSlug }) => {
  const [showAdminItems, setShowAdminItems] = useState(
    type === 'admin' || type === 'teacher'
  );
  const [active, setActive] = useState('dashboard');
  const [isActive, setIsActive] = useState(false);

  const router = useRouter();
  const handleItemClick = (action) => {
    switch (action) {
      case 'logout': logoutUser(router); break;
      case 'profile': break;
      default: break;
    }
  };

  const {
    setProfileModal, setCoursesModal, setRedeemActive,
    userDetails, ctxSlug, setCTXSlug, sk, setSK, isDemo,
    // Phase 16 Ship C: collapsible sidebar
    sidebarCollapsed,
  } = useNMNContext();

  function convertToWebP(url) {
    if (url == undefined) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload') + 1;
    parts.splice(uploadIndex, 0, 'c_fill,w_256,h_256,f_webp');
    return parts.join('/');
  }

  const profile = [
    { title: 'Profile Details', action: () => { setProfileModal(true); }, itemClass: '' },
    { title: 'Courses Enrolled', action: () => { setCoursesModal(true); }, itemClass: '' },
    { title: 'Redeem Code', action: () => { setRedeemActive(true); }, itemClass: '' },
    { title: 'Report an Issue', action: () => { setRedeemActive(true); }, itemClass: '' },
    { title: 'Logout', action: () => { logoutUser(router); }, itemClass: '!text-red-500' },
  ];

  const accordionItemClasses = {
    title: 'text-sm font-medium',
    subtitle: 'text-xs',
    startContent: 'text-ds-ink2 [&_svg]:w-[18px] [&_svg]:h-[18px]',
    indicator: 'text-ds-ink3',
  };

  const titleStyle = {
    color: 'var(--c-text-secondary)',
    fontWeight: 500,
    fontSize: 14,
    letterSpacing: '-0.005em',
  };

  // Section-label styling — small, uppercase, low contrast — preview's STUDY/RESOURCES/YOU look
  const sectionLabelStyle = {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--c-text-tertiary)',
    padding: '14px 18px 6px',
  };

  // Group accordian items by section, preserving original order within each section
  const sectionItems = (accordian || []).reduce((acc, item) => {
    const section = SECTIONS.find((s) => s.titles.includes(item.title));
    const key = section ? section.label : 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Render the desktop sub-items (the items under each parent in accordion)
  const renderSubItems = (i) => (
    <ul
      className={'lg:flex flex-col hidden w-full overflow-hidden p-2 rounded-md !px-1 ' + (isActive ? styles.activeMain : '')}
    >
      {i?.items && i.items.map((z, v) => {
        if (z.type === 'admin' && !showAdminItems) return null;

        if (isDemo && z.demo != undefined && z.demo == false) {
          return (
            <li
              key={v}
              onClick={() => { toast.error('Purchase a Course to Unlock'); }}
              className={'opacity-70 relative grayscale !rounded-md transition-all !mx-2 !my-0.5 hover:brightness-95'}
              style={{ animationDelay: (v + 1) * 30 + 'ms' }}
            >
              <>
                <div className={styles.clickable} onClick={() => {}}>
                  <a><Lock size={16} /><p className="hidden md:block">{z.title}</p></a>
                </div>
                <p
                  className="md:hidden absolute left-[70px] text-left top-[50%] rounded-xl shadow-md p-2 w-auto -translate-y-[50%]"
                  style={{ background: 'var(--c-surface)' }}
                >
                  {z.title}
                </p>
              </>
            </li>
          );
        }

        return (
          <li
            key={v}
            onClick={() => { setCTXSlug(z.action); }}
            className={(ctxSlug == z.action ? styles.active : '') + ' relative !rounded-md transition-all !mx-2 !my-0.5'}
            style={{ animationDelay: (v + 1) * 30 + 'ms' }}
          >
            <>
              <div className={styles.clickable} onClick={() => handleItemClick(z.action)}>
                <a>
                  {z.icon}
                  <p className="hidden md:block">{z.title}</p>
                  {z.badge && (
                    <span
                      className="hidden md:inline-block"
                      style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-brand-gold)', background: 'var(--c-brand-gold-tint)', borderRadius: 999, padding: '3px 8px' }}
                    >
                      {z.badge}
                    </span>
                  )}
                </a>
              </div>
              <p
                className="md:hidden absolute left-[70px] text-left top-[50%] rounded-xl shadow-md p-2 w-auto -translate-y-[50%]"
                style={{ background: 'var(--c-surface)' }}
              >
                {z.title}
              </p>
            </>
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav className={styles.nav}>
      {/* ── Mobile toggle button ────────────────────────────────── */}
      <div
        onClick={() => { setIsActive(!isActive); }}
        className={
          styles.navopener +
          ' transition-all z-10 rounded-full bg-primary fixed bottom-[25px] left-[25px] lg:hidden p-3 shadow-md hover:shadow-primary' +
          ` ${isActive ? styles.activeButton : ''}`
        }
      >
        <svg className={styles.ham} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.75254 17.9997H21.2525C21.6668 17.9997 22.0025 18.3355 22.0025 18.7497C22.0025 19.1294 21.7204 19.4432 21.3543 19.4928L21.2525 19.4997H2.75254C2.33832 19.4997 2.00254 19.1639 2.00254 18.7497C2.00254 18.37 2.28469 18.0562 2.65077 18.0065L2.75254 17.9997H21.2525H2.75254ZM2.75254 11.5027H21.2525C21.6668 11.5027 22.0025 11.8385 22.0025 12.2527C22.0025 12.6324 21.7204 12.9462 21.3543 12.9959L21.2525 13.0027H2.75254C2.33832 13.0027 2.00254 12.6669 2.00254 12.2527C2.00254 11.873 2.28469 11.5592 2.65077 11.5095L2.75254 11.5027H21.2525H2.75254ZM2.75168 5.00293H21.2517C21.6659 5.00293 22.0017 5.33872 22.0017 5.75293C22.0017 6.13263 21.7195 6.44642 21.3535 6.49608L21.2517 6.50293H2.75168C2.33746 6.50293 2.00168 6.16714 2.00168 5.75293C2.00168 5.37323 2.28383 5.05944 2.64991 5.00978L2.75168 5.00293H21.2517H2.75168Z" fill="white"/>
        </svg>
        <svg className={styles.close} width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.883 3.007 12 3a1 1 0 0 1 .993.883L13 4v7h7a1 1 0 0 1 .993.883L21 12a1 1 0 0 1-.883.993L20 13h-7v7a1 1 0 0 1-.883.993L12 21a1 1 0 0 1-.993-.883L11 20v-7H4a1 1 0 0 1-.993-.883L3 12a1 1 0 0 1 .883-.993L4 11h7V4a1 1 0 0 1 .883-.993L12 3l-.117.007Z" fill="white"/>
        </svg>
      </div>

      {/* ── Mobile slide-out drawer ─────────────────────────────── */}
      <div
        className={`${styles.navslide} ${isActive ? styles.activeNav : ''} lg:hidden fixed flex flex-row left-0 bottom-0 w-full h-full z-0 backdrop-blur-sm ${
          isActive ? 'pointer-events-all' : 'pointer-events-none'
        }`}
      >
        <div
          className="w-full max-w-[90%] flex flex-col lg:p-0 p-3 shadow-lg h-full"
          style={{ background: 'var(--c-surface)' }}
        >
          <div className="flex flex-row justify-start p-2 align-bottom items-center mt-2">
            <svg
              className="hover:bg-[var(--c-surface-sunken)] transition-all cursor-pointer mr-4 rounded-full"
              onClick={() => { setIsActive(false); }}
              width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="currentColor"/>
            </svg>
            <img src="/newlog.svg" width={150} className="flex object-cover" alt="IPM Careers" />
          </div>

          <Divider className="my-4" />

          <div className="px-3 pb-1">
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--c-brand-gold)' }}>
              Welcome back
            </div>
            <div className="ds-display" style={{ fontSize: 20, color: 'var(--c-text-primary)', marginTop: 2 }}>
              {userDetails?.user_metadata?.full_name}
            </div>
          </div>

          <Accordion
            itemClasses={accordionItemClasses}
            className="flex lg:hidden max-h-[90vh] overflow-auto w-full p-2 flex-col flex-nowrap"
            selectedKeys={sk}
            onSelectionChange={(e) => { setSK(new Set(e)); }}
            fullWidth showDivider={false} isCompact
          >
            <AccordionItem
              key={'User Profile'}
              className="w-full font-sans"
              title={<span style={titleStyle}>Your profile</span>}
              startContent={
                <Avatar
                  color="primary"
                  name={(userDetails?.user_metadata?.full_name || 'S').charAt(0)}
                  className="w-8 h-8 text-[12px] font-semibold"
                  src={convertToWebP(userDetails?.user_metadata?.profile_pic) || undefined}
                />
              }
            >
              <ul className={'flex-col flex w-full overflow-hidden text-sm ' + (isActive ? styles.activeMain : '')}>
                {profile && profile.map((z, v) => (
                  <li
                    key={v}
                    onClick={() => { z.action(); setIsActive(false); }}
                    className={(ctxSlug == z.action ? styles.active : '') + ' relative !mx-0 !my-1 !rounded-md ' + z.itemClass}
                    style={{ animationDelay: (v + 1) * 30 + 'ms', borderTop: '1px solid var(--c-border-faint)' }}
                  >
                    <p className="text-center rounded-xl w-full">{z.title}</p>
                  </li>
                ))}
              </ul>
            </AccordionItem>

            {accordian && accordian.filter((i) => !i.flat).map((i, d) => (
              <AccordionItem
                key={i.title}
                startContent={i.icon || ''}
                className="w-full font-sans"
                title={<span style={titleStyle}>{i.title}</span>}
              >
                <ul
                  className={'lg:hidden flex-col flex w-full overflow-hidden p-3 rounded-lg !px-1 ' + (isActive ? styles.activeMain : '')}
                  style={{ background: 'var(--c-surface-muted)', border: '1px solid var(--c-border-faint)' }}
                >
                  {i?.items && i.items.map((z, v) => {
                    if (z.type === 'admin' && !showAdminItems) return null;
                    return (
                      <li
                        key={v}
                        onClick={() => { setCTXSlug(z.action); setIsActive(false); }}
                        className={(ctxSlug == z.action ? styles.active : '') + ' relative !mx-0 !my-1'}
                        style={{ animationDelay: (v + 1) * 30 + 'ms' }}
                      >
                        <a>{z.icon}<p className="hidden md:block">{z.title}</p></a>
                        <p className="md:hidden text-center rounded-xl w-full">{z.title}</p>
                      </li>
                    );
                  })}
                </ul>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Flat items — direct links in the mobile drawer (no accordion) */}
          {accordian && accordian.filter((i) => i.flat).map((i) => {
            const target = i.items?.[0];
            if (!target) return null;
            const active = ctxSlug === target.action;
            return (
              <div
                key={i.title}
                onClick={() => { setCTXSlug(target.action); setIsActive(false); }}
                className="flex items-center gap-2 mx-3 rounded-lg transition-all cursor-pointer"
                style={{
                  padding: '10px 12px',
                  color: active ? 'var(--c-brand-primary)' : 'var(--c-text-secondary)',
                  background: active ? 'var(--c-brand-primary-tint)' : 'transparent',
                }}
              >
                {i.icon}
                <span style={titleStyle}>{i.title}</span>
                {i.badge && (
                  <span
                    style={{
                      marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--c-brand-gold)',
                      background: 'var(--c-brand-gold-tint)', borderRadius: 999, padding: '3px 8px',
                    }}
                  >
                    {i.badge}
                  </span>
                )}
              </div>
            );
          })}

          <div
            className="flex mt-auto flex-row items-center justify-between flex-shrink-0 w-full px-4 py-3 rounded-2xl"
            style={{ background: 'var(--c-mock-banner)', border: '1px solid var(--c-mock-banner-line)', color: 'var(--c-mock-banner-text)' }}
          >
            <span className="ds-display" style={{ fontSize: 16.5 }}>Have a doubt?</span>
            <Button
              size="sm"
              as={Link}
              href="tel:+918299470392"
              style={{ background: 'var(--c-mock-banner-btn-bg)', color: 'var(--c-mock-banner-btn-fg)', fontWeight: 600, borderRadius: 999 }}
            >
              Connect with us
            </Button>
          </div>

          <div className="lg:hidden block bottom-1 text-xs w-full font-sans text-center p-2" style={{ color: 'var(--c-text-tertiary)' }}>
            © 2026 IPM Careers. All rights reserved
          </div>
        </div>
        <div className="flex flex-1 h-full bg-transparent cursor-pointer" onClick={() => { setIsActive(false); }}></div>
      </div>

      {/* ── Desktop sidebar — COLLAPSED MODE (icon-only with hover tooltip) ───── */}
      {sidebarCollapsed && (
        <div className="hidden lg:flex w-full flex-col items-stretch flex-nowrap max-h-[70vh] overflow-y-auto overflow-x-visible mt-[100px] pt-2 px-0">
          {SECTIONS.map((section, secIdx) => {
            const items = sectionItems[section.label] || [];
            if (items.length === 0) return null;
            return (
              <div key={section.label}>
                {/* Section divider line (no label) */}
                {secIdx > 0 && (
                  <div style={{ height: 1, background: 'var(--c-border-faint)', margin: '6px 14px' }} />
                )}
                {items.map((parent) => {
                  // Find first user-facing sub-item to navigate to when this parent icon is clicked.
                  const firstSub = parent.items?.find((s) => {
                    if (s.type === 'admin' && !showAdminItems) return false;
                    if (isDemo && s.demo === false) return false;
                    return true;
                  });
                  // Active when any of this parent's items matches current ctxSlug.
                  const isParentActive = parent.items?.some((s) => s.action === ctxSlug);
                  const locked = isDemo && parent.demo === false;
                  return (
                    <div
                      key={parent.title}
                      onClick={() => {
                        if (locked) {
                          toast.error('Purchase a Course to Unlock');
                          return;
                        }
                        if (firstSub) setCTXSlug(firstSub.action);
                      }}
                      title={parent.title}
                      style={{
                        position: 'relative',
                        margin: '3px 10px',
                        padding: '11px 0',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isParentActive ? 'var(--c-brand-primary)' : 'var(--c-text-secondary)',
                        background: isParentActive ? 'var(--c-brand-primary-tint)' : 'transparent',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        opacity: locked ? 0.6 : 1,
                        transition: 'background 0.15s ease, color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isParentActive) e.currentTarget.style.background = 'var(--c-surface-muted)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isParentActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {locked ? <Lock size={20} /> : (parent.icon || null)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Desktop sidebar — EXPANDED MODE (sections with labels) ─────────────── */}
      {!sidebarCollapsed && (
      <div className="hidden lg:flex w-full flex-col flex-nowrap max-h-[70vh] overflow-y-auto p-1">
        {SECTIONS.map((section) => {
          const items = sectionItems[section.label] || [];
          if (items.length === 0) return null;
          const accItems = items.filter((i) => !i.flat);
          const flatItems = items.filter((i) => i.flat);
          return (
            <div key={section.label}>
              <div style={sectionLabelStyle}>{section.label}</div>
              <Accordion
                itemClasses={accordionItemClasses}
                selectedKeys={sk}
                onSelectionChange={(e) => { setSK(new Set(e)); }}
                showDivider={false}
                fullWidth isCompact
                className="px-1"
              >
                {accItems.map((i, d) => (
                  <AccordionItem
                    isDisabled={isDemo && i.demo === false}
                    startContent={
                      isDemo && i.demo === false ? (
                        <Lock size={18} />
                      ) : (
                        i.icon || ''
                      )
                    }
                    key={i.title}
                    className="w-full font-sans"
                    title={<span style={titleStyle}>{i.title}</span>}
                  >
                    {renderSubItems(i)}
                  </AccordionItem>
                ))}
              </Accordion>
              {/* Flat items — direct links (no accordion), e.g. DSB Challenge */}
              {flatItems.map((i) => {
                const target = i.items?.[0];
                if (!target) return null;
                const active = ctxSlug === target.action;
                return (
                  <div
                    key={i.title}
                    onClick={() => setCTXSlug(target.action)}
                    className="flex items-center gap-2 mx-2 rounded-lg transition-all cursor-pointer"
                    style={{
                      padding: '9px 10px',
                      marginLeft: i.indent ? 26 : undefined, // e.g. DSB Challenge tucks under Tests
                      color: active ? 'var(--c-brand-primary)' : 'var(--c-text-secondary)',
                      background: active ? 'var(--c-brand-primary-tint)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--c-surface-muted)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {i.icon}
                    <span style={titleStyle}>{i.title}</span>
                    {i.badge && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--c-brand-gold)',
                          background: 'var(--c-brand-gold-tint)',
                          borderRadius: 999,
                          padding: '3px 8px',
                        }}
                      >
                        {i.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      )}
    </nav>
  );
};

export default Navbar;
