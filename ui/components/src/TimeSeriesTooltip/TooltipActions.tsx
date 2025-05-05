import { Box, Icon, MenuItem, Stack, Typography } from '@mui/material';
import Magnify from 'mdi-material-ui/Magnify';
import { PointAction, TOOLTIP_BG_COLOR_FALLBACK, TOOLTIP_MAX_WIDTH } from './tooltip-model';
import { NearbySeriesInfo } from './nearby-series';

export interface TooltipActionProps {
  actions: PointAction[];
  selectedSeries: NearbySeriesInfo | undefined;
  isPinned: boolean;
  onUnpinClick?: () => void;
}
export const TooltipActions: React.FC<TooltipActionProps> = ({ actions, selectedSeries, onUnpinClick, isPinned }) => {
  return (
    <Box
      sx={(theme) => ({
        width: '100%',
        maxWidth: TOOLTIP_MAX_WIDTH,
        padding: theme.spacing(0.5, 1),
        backgroundColor: theme.palette.common.white ?? TOOLTIP_BG_COLOR_FALLBACK,
        position: 'sticky',
        top: 0,
        left: 0,
      })}
    >
      {!isPinned ? (
        <Box
          sx={(theme) => ({
            display: 'flex',
            padding: theme.spacing(1),
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: theme.palette.text.primary,
          })}
        >
          <Typography fontSize={12}>Click To Drilldown</Typography>
          <Icon>
            <Magnify />
          </Icon>
        </Box>
      ) : !selectedSeries ? (
        <Box
          sx={(theme) => ({
            display: 'flex',
            padding: theme.spacing(1),
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: theme.palette.text.primary,
          })}
        >
          <Typography fontSize="12">Select one series to drilldown</Typography>
          <Icon>
            <Magnify />
          </Icon>
        </Box>
      ) : (
        <Stack my={0.5}>
          {actions.map((action) => {
            return (
              <MenuItem
                disabled={selectedSeries === undefined}
                key={action.label}
                sx={{ padding: 0, borderRadius: 1 }}
                onClick={() => {
                  if (selectedSeries) {
                    action.onClick(selectedSeries);
                    onUnpinClick?.();
                  }
                }}
              >
                <Box
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: theme.spacing(0.5, 1),
                    gap: 1,
                    height: 32,
                  })}
                >
                  {action.icon && action.icon}
                  <Typography fontSize="12px">{action.label}</Typography>
                </Box>
              </MenuItem>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};
