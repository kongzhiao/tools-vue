import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  AuditOutlined,
  BarChartOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  EllipsisOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  HomeOutlined,
  LeftOutlined,
  MedicineBoxOutlined,
  MinusCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SettingOutlined,
  SolutionOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { history, useLocation, useSelectedRoutes } from '@umijs/max';
import type { MenuProps, TabsProps } from 'antd';
import { Breadcrumb, Dropdown, Tabs } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOutlet } from 'react-router-dom';
import styles from './index.less';

interface WorkspaceTab {
  key: string;
  title: string;
  url: string;
  closable: boolean;
  icon: string;
}

interface PersistedWorkspace {
  tabs: WorkspaceTab[];
  activeKey: string;
}

interface WorkspaceTabsProps {
  children: React.ReactNode;
  userId: number;
}

const HOME_PATH = '/dashboard';
const HOME_TAB: WorkspaceTab = {
  key: HOME_PATH,
  title: '仪表板',
  url: HOME_PATH,
  closable: false,
  icon: 'HomeOutlined',
};

const TAB_ICONS: Record<string, React.ComponentType> = {
  AuditOutlined,
  BarChartOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
  SolutionOutlined,
  TeamOutlined,
};

const ROUTE_ICON_RULES = [
  { prefix: '/user-management', icon: 'TeamOutlined' },
  { prefix: '/business-config', icon: 'SettingOutlined' },
  { prefix: '/data-verification', icon: 'AuditOutlined' },
  { prefix: '/statistics-summary', icon: 'BarChartOutlined' },
  { prefix: '/medical-assistance', icon: 'MedicineBoxOutlined' },
  { prefix: '/unrescued', icon: 'FileSearchOutlined' },
  { prefix: '/enroll', icon: 'SolutionOutlined' },
  { prefix: '/yf/settlement-online', icon: 'GlobalOutlined' },
];

const normalizePath = (pathname: string) => {
  if (!pathname || pathname === '/') return HOME_PATH;
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
};

const getFallbackTitle = (pathname: string) => {
  const segment = pathname.split('/').filter(Boolean).pop();
  return segment || '页面';
};

const getFallbackIcon = (pathname: string) => {
  if (pathname === HOME_PATH) return 'HomeOutlined';
  return (
    ROUTE_ICON_RULES.find((rule) => pathname.startsWith(rule.prefix))?.icon ||
    'HomeOutlined'
  );
};

const readPersistedWorkspace = (
  storageKey: string,
): PersistedWorkspace | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedWorkspace;
    if (!Array.isArray(parsed.tabs)) return null;

    const tabs = parsed.tabs.filter(
      (tab): tab is WorkspaceTab =>
        !!tab &&
        typeof tab.key === 'string' &&
        typeof tab.title === 'string' &&
        typeof tab.url === 'string',
    );

    return {
      tabs: [
        HOME_TAB,
        ...tabs
          .filter((tab) => tab.key !== HOME_PATH)
          .map((tab) => ({
            ...tab,
            icon: tab.icon || getFallbackIcon(tab.key),
          })),
      ],
      activeKey: normalizePath(parsed.activeKey || HOME_PATH),
    };
  } catch {
    return null;
  }
};

const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ children, userId }) => {
  const location = useLocation();
  const outlet = useOutlet();
  const selectedRoutes = useSelectedRoutes();
  const currentKey = normalizePath(location.pathname);
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  const routeTitle = [...selectedRoutes]
    .reverse()
    .map((item) => (item.route as { name?: unknown })?.name)
    .find((name) => typeof name === 'string') as string | undefined;
  const currentTitle = routeTitle || getFallbackTitle(currentKey);
  const currentIcon =
    [...selectedRoutes]
      .reverse()
      .map((item) => (item.route as { icon?: unknown })?.icon)
      .find((icon) => typeof icon === 'string') || getFallbackIcon(currentKey);
  const breadcrumbItems = selectedRoutes
    .map((item) => {
      const title = (item.route as { name?: unknown })?.name;
      return typeof title === 'string' ? { title } : null;
    })
    .filter((item): item is { title: string } => item !== null);
  const storageKey = `workspace-tabs:${userId}`;
  const pageCacheRef = useRef(new Map<string, React.ReactNode>());
  const tabRailRef = useRef<HTMLDivElement>(null);
  const currentPage = outlet || children;

  const [tabs, setTabs] = useState<WorkspaceTab[]>(() => {
    const persisted = readPersistedWorkspace(storageKey);
    const restoredTabs = persisted?.tabs || [HOME_TAB];
    if (restoredTabs.some((tab) => tab.key === currentKey)) return restoredTabs;

    return [
      ...restoredTabs,
      {
        key: currentKey,
        title: currentTitle,
        url: currentUrl,
        closable: currentKey !== HOME_PATH,
        icon: String(currentIcon),
      },
    ];
  });
  const [refreshVersions, setRefreshVersions] = useState<
    Record<string, number>
  >({});
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [tabScrollState, setTabScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  if (!pageCacheRef.current.has(currentKey)) {
    // childrenRender 传入的是动态 Outlet；必须缓存已解析出的页面实例，
    // 否则每个历史页签都会跟随当前路由重新渲染并重复请求接口。
    pageCacheRef.current.set(currentKey, currentPage);
  }

  useEffect(() => {
    setTabs((previousTabs) => {
      const existingIndex = previousTabs.findIndex(
        (tab) => tab.key === currentKey,
      );
      if (existingIndex === -1) {
        return [
          ...previousTabs,
          {
            key: currentKey,
            title: currentTitle,
            url: currentUrl,
            closable: currentKey !== HOME_PATH,
            icon: String(currentIcon),
          },
        ];
      }

      const existing = previousTabs[existingIndex];
      if (
        existing.url === currentUrl &&
        existing.title === currentTitle &&
        existing.icon === String(currentIcon)
      )
        return previousTabs;

      const nextTabs = [...previousTabs];
      nextTabs[existingIndex] = {
        ...existing,
        title: currentTitle,
        url: currentUrl,
        icon: String(currentIcon),
      };
      return nextTabs;
    });
  }, [currentIcon, currentKey, currentTitle, currentUrl]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        tabs,
        activeKey: currentKey,
      } satisfies PersistedWorkspace),
    );
  }, [currentKey, storageKey, tabs]);

  useEffect(() => {
    const scroller =
      tabRailRef.current?.querySelector<HTMLElement>('.ant-tabs-nav-wrap');
    if (!scroller) return undefined;
    const tabList = scroller.querySelector<HTMLElement>('.ant-tabs-nav-list');

    const handleWheel = (event: WheelEvent) => {
      // 触控板缩放也会产生 wheel 事件，不能把缩放误判成页签滚动。
      if (event.ctrlKey) return;

      const isHorizontalGesture =
        Math.abs(event.deltaX) >= Math.abs(event.deltaY);
      const rawDelta = isHorizontalGesture ? event.deltaX : event.deltaY;
      if (rawDelta === 0) return;

      const deltaScale =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? scroller.clientWidth
          : 1;
      const scrollDelta = rawDelta * deltaScale;
      const maxScrollLeft = Math.max(
        0,
        scroller.scrollWidth - scroller.clientWidth,
      );
      const nextScrollLeft = Math.min(
        maxScrollLeft,
        Math.max(0, scroller.scrollLeft + scrollDelta),
      );

      // 页签能移动时接管手势；抵达边界后仍允许页面继续上下滚动。
      if (Math.abs(nextScrollLeft - scroller.scrollLeft) < 0.5) {
        // 横向手势在边界处等同于点击已禁用的箭头，避免误触浏览器前进/后退。
        if (isHorizontalGesture && maxScrollLeft > 0) event.preventDefault();
        return;
      }

      event.preventDefault();
      scroller.scrollBy({ left: scrollDelta, behavior: 'auto' });
    };

    const updateScrollState = () => {
      const tabNodes = Array.from(
        scroller.querySelectorAll<HTMLElement>('.ant-tabs-tab'),
      );
      const lastTab = tabNodes[tabNodes.length - 1];
      const measuredContentWidth = lastTab
        ? lastTab.offsetLeft + lastTab.offsetWidth
        : 0;
      const contentWidth = Math.max(
        scroller.scrollWidth,
        tabList?.scrollWidth || 0,
        measuredContentWidth,
      );
      const maxScrollLeft = Math.max(0, contentWidth - scroller.clientWidth);
      setTabScrollState({
        hasOverflow: maxScrollLeft > 1,
        canScrollLeft: scroller.scrollLeft > 1,
        canScrollRight: scroller.scrollLeft < maxScrollLeft - 1,
      });
    };

    const showActiveTab = () => {
      const activeTab = scroller.querySelector<HTMLElement>(
        '.ant-tabs-tab-active',
      );
      if (!activeTab) return;

      const visibleLeft = scroller.scrollLeft;
      const visibleRight = visibleLeft + scroller.clientWidth;
      const tabLeft = activeTab.offsetLeft;
      const tabRight = tabLeft + activeTab.offsetWidth;

      if (tabLeft < visibleLeft) {
        scroller.scrollTo({ left: tabLeft, behavior: 'smooth' });
      } else if (tabRight > visibleRight) {
        scroller.scrollTo({
          left: tabRight - scroller.clientWidth,
          behavior: 'smooth',
        });
      }
    };

    const frameId = window.requestAnimationFrame(() => {
      updateScrollState();
      showActiveTab();
    });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);
    if (tabList) resizeObserver.observe(tabList);
    scroller.addEventListener('scroll', updateScrollState, { passive: true });
    scroller.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scroller.removeEventListener('scroll', updateScrollState);
      scroller.removeEventListener('wheel', handleWheel);
    };
  }, [currentKey, tabs]);

  const scrollTabs = (direction: -1 | 1) => {
    const scroller =
      tabRailRef.current?.querySelector<HTMLElement>('.ant-tabs-nav-wrap');
    scroller?.scrollBy({ left: direction * 240, behavior: 'smooth' });
  };

  const navigateToTab = (tab: WorkspaceTab | undefined) => {
    if (tab && tab.key !== currentKey) history.push(tab.url);
  };

  const applyTabs = (nextTabs: WorkspaceTab[], targetKey: string) => {
    const normalizedTabs = nextTabs.some((tab) => tab.key === HOME_PATH)
      ? nextTabs
      : [HOME_TAB, ...nextTabs];
    const removedKeys = new Set(
      tabs
        .filter(
          (tab) => !normalizedTabs.some((nextTab) => nextTab.key === tab.key),
        )
        .map((tab) => tab.key),
    );
    removedKeys.forEach((key) => pageCacheRef.current.delete(key));
    setTabs(normalizedTabs);

    if (removedKeys.has(currentKey)) {
      navigateToTab(
        normalizedTabs.find((tab) => tab.key === targetKey) ||
          normalizedTabs[normalizedTabs.length - 1],
      );
    }
  };

  const closeTab = (targetKey: string) => {
    if (targetKey === HOME_PATH) return;
    const targetIndex = tabs.findIndex((tab) => tab.key === targetKey);
    if (targetIndex < 0) return;

    const nextTabs = tabs.filter((tab) => tab.key !== targetKey);
    const fallbackTab =
      nextTabs[targetIndex] || nextTabs[targetIndex - 1] || HOME_TAB;
    applyTabs(nextTabs, fallbackTab.key);
  };

  const refreshTab = (targetKey: string) => {
    const targetTab = tabs.find((tab) => tab.key === targetKey);
    if (!targetTab) return;

    if (targetKey !== currentKey) {
      history.push(targetTab.url);
      window.setTimeout(() => {
        pageCacheRef.current.delete(targetKey);
        setRefreshVersions((versions) => ({
          ...versions,
          [targetKey]: (versions[targetKey] || 0) + 1,
        }));
      }, 0);
      return;
    }

    pageCacheRef.current.set(targetKey, currentPage);
    setRefreshVersions((versions) => ({
      ...versions,
      [targetKey]: (versions[targetKey] || 0) + 1,
    }));
  };

  const reorderTab = (
    sourceKey: string,
    targetKey: string,
    placeAfterTarget: boolean,
  ) => {
    if (
      sourceKey === HOME_PATH ||
      sourceKey === targetKey ||
      !tabs.some((tab) => tab.key === sourceKey)
    ) {
      return;
    }

    setTabs((previousTabs) => {
      const sourceTab = previousTabs.find((tab) => tab.key === sourceKey);
      if (!sourceTab) return previousTabs;

      const nextTabs = previousTabs.filter((tab) => tab.key !== sourceKey);
      const targetIndex = nextTabs.findIndex((tab) => tab.key === targetKey);
      const insertIndex = Math.max(
        1,
        targetIndex < 0
          ? nextTabs.length
          : targetIndex + (placeAfterTarget ? 1 : 0),
      );
      nextTabs.splice(insertIndex, 0, sourceTab);
      return nextTabs;
    });
  };

  const getContextMenu = (targetKey: string): MenuProps['items'] => {
    const targetIndex = tabs.findIndex((tab) => tab.key === targetKey);
    const hasClosableLeft = tabs
      .slice(0, targetIndex)
      .some((tab) => tab.closable);
    const hasClosableRight = tabs
      .slice(targetIndex + 1)
      .some((tab) => tab.closable);
    const closableCount = tabs.filter((tab) => tab.closable).length;

    return [
      {
        key: 'refresh',
        icon: <ReloadOutlined />,
        label: '刷新当前页签',
        onClick: () => refreshTab(targetKey),
      },
      {
        key: 'close',
        icon: <CloseOutlined />,
        label: '关闭当前页签',
        disabled: targetKey === HOME_PATH,
        onClick: () => closeTab(targetKey),
      },
      { type: 'divider' },
      {
        key: 'close-left',
        icon: <ArrowLeftOutlined />,
        label: '关闭左侧页签',
        disabled: !hasClosableLeft,
        onClick: () => {
          const keptTabs = tabs.filter(
            (tab, index) => index >= targetIndex || !tab.closable,
          );
          applyTabs(keptTabs, targetKey);
        },
      },
      {
        key: 'close-right',
        icon: <ArrowRightOutlined />,
        label: '关闭右侧页签',
        disabled: !hasClosableRight,
        onClick: () => {
          const keptTabs = tabs.filter(
            (tab, index) => index <= targetIndex || !tab.closable,
          );
          applyTabs(keptTabs, targetKey);
        },
      },
      { type: 'divider' },
      {
        key: 'close-others',
        icon: <MinusCircleOutlined />,
        label: '关闭其它页签',
        disabled: closableCount <= (targetKey === HOME_PATH ? 0 : 1),
        onClick: () => {
          const keptTabs = tabs.filter(
            (tab) => !tab.closable || tab.key === targetKey,
          );
          applyTabs(keptTabs, targetKey);
        },
      },
      {
        key: 'close-all',
        icon: <CloseCircleOutlined />,
        label: '关闭全部页签',
        disabled: closableCount === 0,
        onClick: () => applyTabs([HOME_TAB], HOME_PATH),
      },
    ];
  };

  const visibleTabs = useMemo(() => {
    if (tabs.some((tab) => tab.key === currentKey)) return tabs;
    return [
      ...tabs,
      {
        key: currentKey,
        title: currentTitle,
        url: currentUrl,
        closable: currentKey !== HOME_PATH,
        icon: String(currentIcon),
      },
    ];
  }, [currentIcon, currentKey, currentTitle, currentUrl, tabs]);

  const tabItems: TabsProps['items'] = visibleTabs.map((tab) => ({
    key: tab.key,
    closable: tab.closable,
    label: (
      <Dropdown
        menu={{ items: getContextMenu(tab.key) }}
        trigger={['contextMenu']}
      >
        <span
          className={`${styles.tabLabel} ${
            tab.key === HOME_PATH ? styles.homeTabLabel : ''
          } ${draggingKey === tab.key ? styles.dragging : ''} ${
            dragOverKey === tab.key ? styles.dragOver : ''
          }`}
          aria-label={tab.title}
          title={tab.title}
          draggable={tab.key !== HOME_PATH}
          onDragStart={(event) => {
            if (tab.key === HOME_PATH) return;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', tab.key);
            setDraggingKey(tab.key);
          }}
          onDragEnter={() => {
            if (draggingKey && draggingKey !== tab.key) setDragOverKey(tab.key);
          }}
          onDragOver={(event) => {
            if (!draggingKey || draggingKey === tab.key) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            event.preventDefault();
            const sourceKey =
              draggingKey || event.dataTransfer.getData('text/plain');
            const bounds = event.currentTarget.getBoundingClientRect();
            reorderTab(
              sourceKey,
              tab.key,
              event.clientX > bounds.left + bounds.width / 2,
            );
            setDraggingKey(null);
            setDragOverKey(null);
          }}
          onDragEnd={() => {
            setDraggingKey(null);
            setDragOverKey(null);
          }}
        >
          {React.createElement(TAB_ICONS[tab.icon] || TAB_ICONS.HomeOutlined)}
          {tab.key === HOME_PATH ? null : <span>{tab.title}</span>}
        </span>
      </Dropdown>
    ),
    children: pageCacheRef.current.has(tab.key) ? (
      <div
        key={`${tab.key}:${refreshVersions[tab.key] || 0}`}
        className={styles.pagePane}
      >
        {pageCacheRef.current.get(tab.key)}
      </div>
    ) : null,
  }));

  return (
    <div className={styles.workspace}>
      <Tabs
        className={styles.tabs}
        type="editable-card"
        hideAdd
        activeKey={currentKey}
        destroyOnHidden={false}
        items={tabItems}
        moreIcon={<EllipsisOutlined />}
        renderTabBar={(tabBarProps, DefaultTabBar) => (
          <div className={styles.workspaceHeader}>
            <Breadcrumb className={styles.breadcrumb} items={breadcrumbItems} />
            <div className={styles.tabRail} ref={tabRailRef}>
              <button
                type="button"
                className={`${styles.scrollButton} ${
                  !tabScrollState.hasOverflow ? styles.scrollButtonHidden : ''
                }`}
                disabled={!tabScrollState.canScrollLeft}
                title="向左滚动页签"
                aria-label="向左滚动页签"
                onClick={() => scrollTabs(-1)}
              >
                <LeftOutlined />
              </button>
              <div className={styles.tabViewport}>
                <DefaultTabBar {...tabBarProps} />
              </div>
              <button
                type="button"
                className={`${styles.scrollButton} ${
                  !tabScrollState.hasOverflow ? styles.scrollButtonHidden : ''
                }`}
                disabled={!tabScrollState.canScrollRight}
                title="向右滚动页签"
                aria-label="向右滚动页签"
                onClick={() => scrollTabs(1)}
              >
                <RightOutlined />
              </button>
            </div>
          </div>
        )}
        onChange={(key) => navigateToTab(tabs.find((tab) => tab.key === key))}
        onEdit={(targetKey, action) => {
          if (action === 'remove') closeTab(String(targetKey));
        }}
      />
    </div>
  );
};

export default WorkspaceTabs;
