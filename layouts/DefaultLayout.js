import Navbar from '@/components/Navbar';
import styles from './DefaultLayout.module.css'
import { useNMNContext } from '@/components/NMNContext';
import { Button, Modal, ModalBody, ModalContent, ModalHeader } from '@nextui-org/react';
import ReportIssueForm from '@/components/ReportAnIssue';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

function DefaultLayout(props){

  const {
    sideBar, setSideBar, sideBarContent, navitems, userCourses,
    isDemo, reportActive, setReportActive,
    // Phase 16 Ship C: collapsible sidebar state
    sidebarCollapsed, toggleSidebar,
  } = useNMNContext();

  const accordian = navitems;

  if (isDemo == true && userCourses?.length > 0) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center"
           style={{ background: 'var(--c-bg)', color: 'var(--c-text-primary)' }}>
        <p className='text-center text-lg'>
          <svg className=' rotate-45 mx-auto' width="48" height="48" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 12 7Z"
                  className='fill-red-500 '/>
          </svg>
          You have already enrolled in a course.<br/>
          You cannot access demo mode.
        </p>
        <Button as={Link} href='/' className=' bg-gradient-purple text-white mt-4' size='sm'>Go to Back to Study Panel</Button>
      </div>
    );
  }

  return (
    <div className={styles.main} style={{ background: 'var(--c-bg)' }}>
      <ThemeToggle />

      <Modal isOpen={reportActive} onClose={() => { setReportActive(false); }}>
        <ModalContent>
          <ModalBody>
            <ReportIssueForm onClose={() => { setReportActive(false); }}></ReportIssueForm>
          </ModalBody>
        </ModalContent>
      </Modal>

      <div
        className={
          'w-full max-w-[800px] shadow-lg h-full fixed right-0 top-0 translate-x-full opacity-0 transition-all duration-250 z-50 ' +
          (sideBar == true ? ' !translate-x-0 !opacity-100' : '')
        }
        style={{ background: 'var(--c-surface)' }}
      >
        <Button
          className='absolute top-1/2 rounded-r-none -left-8'
          isIconOnly color="primary" size='sm'
          onPress={() => { setSideBar(false); }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z" fill="#ffffff"/>
          </svg>
        </Button>
        {sideBarContent}
      </div>

      {/* Phase 16 Ship C: sidebar width is dynamic — 76px collapsed, 350px expanded. Smooth transition. */}
      <div
        className={styles.left + " " + styles.gamecontainer + " shadow-xl px-2"}
        style={{
          background: 'var(--c-surface)',
          borderRight: '1px solid var(--c-border-faint)',
          width: sidebarCollapsed ? 76 : 350,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Collapse-mode logo (just the mark) vs expanded logo (full wordmark) */}
        {sidebarCollapsed ? (
          <div
            className={styles.logo + " flex items-center justify-center"}
            style={{ width: '100%', height: 80, position: 'absolute', top: 20, left: 0 }}
          >
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--c-brand-primary)',
                color: 'white',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 14,
              }}
            >
              IPM
            </div>
          </div>
        ) : (
          <img className={styles.logo + " px-6"} width={300} src='/newlog.svg' alt="IPM Careers" />
        )}

        {/* Toggle button — hangs off the right edge of the sidebar */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex"
          style={{
            position: 'absolute',
            top: 38,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border-soft)',
            color: 'var(--c-text-secondary)',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            transition: 'all 0.15s ease',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        <Navbar
          currentSlug={props?.currentSlug}
          changePage={(e) => { props?.changePage ? props.changePage(e) : ''; }}
          accordian={accordian}
          type={props.type || "user"}
        />
        {!sidebarCollapsed && (
          <div
            className="lg:block hidden w-full absolute text-center p-2"
            style={{
              bottom: 5,
              fontSize: 12,
              color: 'var(--c-text-tertiary)',
            }}
          >
            © 2024 IPM Careers. All rights reserved
          </div>
        )}
      </div>

      <div className={`${styles.right} p-2`} style={{ background: 'var(--c-bg)' }}>
        {props.children}
      </div>
    </div>
  );
}

export default DefaultLayout;
