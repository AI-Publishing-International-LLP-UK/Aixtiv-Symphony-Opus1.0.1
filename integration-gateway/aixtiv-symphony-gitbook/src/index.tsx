import {
    createIntegration,
    createComponent,
    FetchEventCallback,
    RuntimeContext,
  } from "@gitbook/runtime";

  type IntegrationContext = {} & RuntimeContext;
  type IntegrationBlockProps = {};
  type IntegrationBlockState = { status: string; lastUpdate: string };
  type IntegrationAction = { action: "refresh" | "viewDocs" };

  const handleFetchEvent: FetchEventCallback<IntegrationContext> = async (
    request,
    context
  ) => {
    // Handle API requests for Aixtiv Symphony status and documentation
    const url = new URL(request.url);
    const { api } = context;
    
    // Get authenticated user for access control (properly awaited)
    let userInfo = null;
    try {
      const userResponse = await api.user.getAuthenticatedUser();
      userInfo = userResponse.data;
    } catch (error) {
      // User not authenticated
      userInfo = null;
    }
    
    if (url.pathname === '/status') {
      return new Response(JSON.stringify({
        system: "Aixtiv Symphony OPUS 1.0.1",
        status: "operational",
        components: {
          "Integration Gateway": "active",
          "Wing Agents": "deployed",
          "VLS Solutions": "available",
          "FMS": "monitoring"
        },
        lastUpdate: new Date().toISOString(),
        accessLevel: userInfo ? "authenticated" : "public"
      }));
    }
    
    if (url.pathname === '/access-check') {
      return new Response(JSON.stringify({
        authenticated: !!userInfo,
        userEmail: userInfo?.email || null,
        accessTier: userInfo ? "tier-3" : "tier-1",
        availableFeatures: userInfo ? 
          ["documentation", "api-access", "support", "advanced-features"] :
          ["public-docs", "contact"]
      }));
    }
    
    return new Response(JSON.stringify({ 
      message: "Aixtiv Symphony Documentation API",
      authRequired: !userInfo
    }));
  };

  const asoosStatusBlock = createComponent<
     IntegrationBlockProps,
     IntegrationBlockState,
     IntegrationAction,
     IntegrationContext
  >({
    componentId: "asoos-documentation",
    initialState: (props) => {
      return {
        status: "Aixtiv Symphony OPUS 1.0.1 - Operational",
        lastUpdate: new Date().toLocaleString(),
      };
    },
    action: async (element, action, context) => {
      switch (action.action) {
        case "refresh":
          return {
            type: "element",
            state: {
              status: "Aixtiv Symphony OPUS 1.0.1 - Refreshed",
              lastUpdate: new Date().toLocaleString()
            }
          };
        case "viewDocs":
          console.log("Navigating to ASOOS Documentation");
          return {
            type: "complete",
            returnValue: { redirected: true }
          };
        default:
          return undefined;
      }
    },
    render: async (element, context) => {
      return (
        <block>
          <text>{element.state.status}</text>
          <text>Last Updated: {element.state.lastUpdate}</text>
          <button label="Refresh Status" onPress={{ action: "refresh" }} />
          <button label="View Documentation" onPress={{ action: "viewDocs" }} />
        </block>
      );
    },
  });

  export default createIntegration({
    fetch: handleFetchEvent,
    components: [asoosStatusBlock],
    events: {},
  });
